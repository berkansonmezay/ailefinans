import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { PrismaService } from "../../prisma/prisma.service";
import { MailService } from "./mail.service";
import * as crypto from "crypto";
import { extname, resolve } from "path";
import { existsSync, writeFileSync, mkdirSync, readdirSync, createReadStream, unlinkSync, statSync } from "fs";

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(dto: {
    username: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    tenantName: string;
  }) {
    // Check if email or username exists
    const existing = await this.prisma.user.findFirst({
      where: { 
        OR: [
          { email: dto.email },
          { username: dto.username }
        ]
      },
    });
    if (existing) {
      if (existing.email === dto.email) {
        throw new ConflictException("Bu e-posta adresi zaten kayıtlı.");
      }
      if (existing.username === dto.username) {
        throw new ConflictException("Bu kullanıcı adı zaten kullanımda.");
      }
    }

    // Hash password (bcrypt, 12 rounds)
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const userCount = await this.prisma.user.count();
    const isFirstUser = userCount === 0;

    // Create user + tenant + membership in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          systemRole: isFirstUser ? 'SUPER_ADMIN' : 'USER',
          isActive: isFirstUser, // First user is automatically active
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          name: dto.tenantName,
        },
      });

      await tx.tenantMember.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      // Seed default categories for this tenant (1 sample category each)
      const defaultExpenseCategories = ["Genel Gider"];
      const defaultIncomeCategories = ["Maaş"];

      for (const name of defaultExpenseCategories) {
        await tx.category.create({
          data: { tenantId: tenant.id, name, type: "EXPENSE", isSystem: true },
        });
      }
      for (const name of defaultIncomeCategories) {
        await tx.category.create({
          data: { tenantId: tenant.id, name, type: "INCOME", isSystem: true },
        });
      }

      return { user, tenant };
    });

    return {
      message: isFirstUser 
        ? "Kurucu hesabınız başarıyla oluşturuldu ve otomatik olarak onaylandı. Giriş yapabilirsiniz." 
        : "Hesabınız başarıyla oluşturuldu. Sistem yöneticisinin onayından sonra giriş yapabilirsiniz.",
      status: isFirstUser ? "APPROVED" : "PENDING_APPROVAL"
    };
  }

  async login(dto: { identifier: string; password: string }) {
    console.log('Login attempt with identifier:', dto.identifier);
    const user = await this.prisma.user.findFirst({
      where: { 
        OR: [
          { email: dto.identifier },
          { username: dto.identifier }
        ]
      },
      include: {
        memberships: {
          where: { isActive: true },
          include: { tenant: true },
        },
      },
    });

    if (!user) {
      console.log('Login failed: user not found');
      throw new UnauthorizedException("Geçersiz e-posta veya şifre.");
    }

    if (!user.isActive) {
      console.log('Login failed: user not active');
      throw new UnauthorizedException("Hesabınız henüz onaylanmamış. Lütfen sistem yöneticisinin onayını bekleyin.");
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    console.log('isPasswordValid:', isPasswordValid, 'for password:', dto.password);
    if (!isPasswordValid) {
      console.log('Login failed: invalid password');
      throw new UnauthorizedException("Geçersiz e-posta veya şifre.");
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Pick first tenant as active
    const activeMembership = user.memberships[0];
    if (!activeMembership) {
      throw new NotFoundException("Herhangi bir aileye üye değilsiniz.");
    }

    const tokens = await this.generateTokens(
      user.id,
      activeMembership.tenantId,
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        activeTenantId: activeMembership.tenantId,
        activeTenantName: activeMembership.tenant.name,
        role: activeMembership.role,
        systemRole: user.systemRole,
        disabledMenus: user.disabledMenus || [],
        tenants: user.memberships.map((m) => ({
          id: m.tenantId,
          name: m.tenant.name,
          role: m.role,
        })),
      },
      ...tokens,
    };
  }

  async refresh(refreshToken: string) {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: {
        user: {
          include: {
            memberships: {
              where: { isActive: true },
              include: { tenant: true },
            },
          },
        },
      },
    });

    if (
      !tokenRecord ||
      tokenRecord.revokedAt ||
      tokenRecord.expiresAt < new Date()
    ) {
      throw new UnauthorizedException(
        "Oturum süresi dolmuş. Lütfen tekrar giriş yapın.",
      );
    }

    // Revoke old token
    await this.prisma.refreshToken.update({
      where: { id: tokenRecord.id },
      data: { revokedAt: new Date() },
    });

    const activeMembership = tokenRecord.user.memberships[0];
    if (!activeMembership) {
      throw new NotFoundException("Herhangi bir aileye üye değilsiniz.");
    }

    const tokens = await this.generateTokens(
      tokenRecord.userId,
      activeMembership.tenantId,
    );

    return {
      user: {
        id: tokenRecord.user.id,
        email: tokenRecord.user.email,
        username: tokenRecord.user.username,
        firstName: tokenRecord.user.firstName,
        lastName: tokenRecord.user.lastName,
        avatarUrl: tokenRecord.user.avatarUrl,
        activeTenantId: activeMembership.tenantId,
        activeTenantName: activeMembership.tenant.name,
        role: activeMembership.role,
        systemRole: tokenRecord.user.systemRole,
        disabledMenus: tokenRecord.user.disabledMenus || [],
        tenants: tokenRecord.user.memberships.map((m) => ({
          id: m.tenantId,
          name: m.tenant.name,
          role: m.role,
        })),
      },
      ...tokens,
    };
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.updateMany({
      where: { token: refreshToken, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { message: "Çıkış başarılı." };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        memberships: {
          where: { isActive: true },
          include: { tenant: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı.");
    }

    const activeMembership = user.memberships[0];

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      activeTenantId: activeMembership?.tenantId,
      activeTenantName: activeMembership?.tenant.name,
      role: activeMembership?.role,
      systemRole: user.systemRole,
      disabledMenus: user.disabledMenus || [],
      tenants: user.memberships.map((m) => ({
        id: m.tenantId,
        name: m.tenant.name,
        role: m.role,
      })),
    };
  }

  async switchTenant(userId: string, tenantId: string) {
    const membership = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      include: { tenant: true },
    });

    if (!membership || !membership.isActive) {
      throw new UnauthorizedException(
        "Bu aileye erişim yetkiniz bulunmamaktadır.",
      );
    }

    const tokens = await this.generateTokens(userId, tenantId);

    const allMemberships = await this.prisma.tenantMember.findMany({
      where: { userId, isActive: true },
      include: { tenant: true },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    return {
      user: {
        id: user!.id,
        email: user!.email,
        username: user!.username,
        firstName: user!.firstName,
        lastName: user!.lastName,
        activeTenantId: tenantId,
        activeTenantName: membership.tenant.name,
        role: membership.role,
        systemRole: user!.systemRole,
        disabledMenus: user!.disabledMenus || [],
        tenants: allMemberships.map((m) => ({
          id: m.tenantId,
          name: m.tenant.name,
          role: m.role,
        })),
      },
      ...tokens,
    };
  }

  async generateTokens(userId: string, tenantId: string) {
    // Get membership to include role in JWT
    const membership = await this.prisma.tenantMember.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });

    const payload = {
      sub: userId,
      tenantId,
      role: membership?.role || "MEMBER",
    };

    const accessToken = this.jwtService.sign(payload);

    // Create refresh token
    const refreshTokenValue = uuid();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
    };
  }

  async updateProfile(userId: string, data: { firstName?: string; lastName?: string; password?: string; username?: string; avatarUrl?: string | null }) {
    const updateData: any = {};
    if (data.firstName) updateData.firstName = data.firstName;
    if (data.lastName) updateData.lastName = data.lastName;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    
    if (data.username) {
      // Check if username is taken by another user
      const existingUser = await this.prisma.user.findFirst({
        where: { username: data.username, id: { not: userId } }
      });
      if (existingUser) {
        throw new BadRequestException("Bu kullanıcı adı zaten alınmış.");
      }
      updateData.username = data.username;
    }

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
      }
    });
    
    return updatedUser;
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Return success even if user not found to prevent email enumeration
      return { message: "Eğer sistemde kayıtlıysa, şifre sıfırlama bağlantısı e-posta adresinize gönderildi." };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // 1 hour

    await this.prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpires },
    });

    await this.mailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi." };
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException("Geçersiz veya süresi dolmuş token.");
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpires: null,
      },
    });

    return { message: "Şifreniz başarıyla güncellendi. Yeni şifrenizle giriş yapabilirsiniz." };
  }

  private getSupabaseConfig() {
    const url = process.env.SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_KEY?.trim();
    const bucket = process.env.SUPABASE_STORAGE_BUCKET?.trim() || "documents";
    if (!url || !key) return null;
    return { url, key, bucket };
  }

  async uploadAvatar(
    userId: string,
    file?: Express.Multer.File,
    body?: { base64?: string; mimeType?: string },
  ) {
    let fileBuffer: Buffer | null = null;
    let mimetype = "image/jpeg";
    let ext = ".jpg";

    if (body?.base64) {
      let rawBase64 = body.base64.trim();
      const dataUrlMatch = rawBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (dataUrlMatch) {
        mimetype = dataUrlMatch[1];
        rawBase64 = dataUrlMatch[2];
      } else if (body.mimeType) {
        mimetype = body.mimeType;
      }

      try {
        fileBuffer = Buffer.from(rawBase64, "base64");
      } catch {
        throw new BadRequestException("Geçersiz base64 resim verisi.");
      }

      if (mimetype.includes("png")) ext = ".png";
      else if (mimetype.includes("webp")) ext = ".webp";
      else if (mimetype.includes("gif")) ext = ".gif";
      else ext = ".jpg";
    } else if (file) {
      fileBuffer = file.buffer;
      mimetype = file.mimetype || "image/jpeg";
      ext = extname(file.originalname || "").toLowerCase() || ".jpg";
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      throw new BadRequestException("Lütfen bir resim dosyası seçin.");
    }

    if (fileBuffer.length > 10 * 1024 * 1024) {
      throw new BadRequestException("Profil resmi en fazla 10MB olabilir.");
    }

    const allowedMimeTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "image/gif",
      "image/heic",
      "image/heif",
      "image/pjpeg",
      "image/x-png",
    ];
    const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".heic", ".heif"];

    const isAllowedMime = allowedMimeTypes.includes(mimetype.toLowerCase());
    const isAllowedExt = allowedExtensions.includes(ext);

    if (!isAllowedMime && !isAllowedExt) {
      throw new BadRequestException("Yalnızca resim dosyaları (JPEG, PNG, WEBP, GIF) yüklenebilir.");
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("Kullanıcı bulunamadı.");
    }

    let avatarUrl = "";
    const filename = `${uuid()}${ext}`;
    const filePath = `avatars/${userId}/${filename}`;

    // 1. Supabase Storage
    const supabase = this.getSupabaseConfig();
    if (supabase) {
      try {
        const uploadUrl = `${supabase.url}/storage/v1/object/${supabase.bucket}/${filePath}`;
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabase.key}`,
            apikey: supabase.key,
            "Content-Type": mimetype,
          },
          body: fileBuffer as any,
        });

        if (uploadRes.ok) {
          const contentType = uploadRes.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const data = await uploadRes.json().catch(() => null);
            if (data && (data.Key || data.id || !data.error)) {
              avatarUrl = `${supabase.url}/storage/v1/object/public/${supabase.bucket}/${filePath}`;
            }
          }
        }
      } catch (err) {
        // Fallback to local storage silently
      }
    }

    // 2. Local fallback storage + Data URL embedding
    if (!avatarUrl) {
      const uploadDir = resolve("./uploads/avatars", userId);
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true });
      } else {
        // Clean up previous avatar files
        try {
          const oldFiles = readdirSync(uploadDir).filter((f) => !f.startsWith("."));
          for (const oldFile of oldFiles) {
            try {
              unlinkSync(resolve(uploadDir, oldFile));
            } catch {}
          }
        } catch {}
      }
      const localFilePath = resolve(uploadDir, filename);
      writeFileSync(localFilePath, fileBuffer);

      // Always store as base64 Data URL directly in the database so that all clients
      // (web, mobile, Expo, cloud, and different developer machines) can render it instantly with 0 sync issues!
      avatarUrl = `data:${mimetype};base64,${fileBuffer.toString("base64")}`;
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
      },
    });

    return {
      avatarUrl: updatedUser.avatarUrl,
      user: updatedUser,
    };
  }

  async removeAvatar(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("Kullanıcı bulunamadı.");

    // Remove local file if exists
    try {
      const uploadDir = resolve("./uploads/avatars", userId);
      if (existsSync(uploadDir)) {
        const files = readdirSync(uploadDir);
        for (const file of files) {
          try {
            unlinkSync(resolve(uploadDir, file));
          } catch {}
        }
      }
    } catch {}

    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: null },
    });

    return { message: "Profil fotoğrafı kaldırıldı.", avatarUrl: null };
  }

  async getAvatarFile(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.avatarUrl) {
      throw new NotFoundException("Profil fotoğrafı bulunamadı.");
    }

    if (user.avatarUrl.startsWith("http://") || user.avatarUrl.startsWith("https://")) {
      return { type: "REDIRECT", url: user.avatarUrl };
    }

    if (user.avatarUrl.startsWith("data:")) {
      const matches = user.avatarUrl.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches) {
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        return {
          type: "BUFFER",
          buffer,
          mimeType,
        };
      }
    }

    const uploadDir = resolve("./uploads/avatars", userId);
    if (!existsSync(uploadDir)) {
      const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "U";
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><rect width="128" height="128" fill="#1e293b"/><text x="50%" y="54%" font-family="system-ui, -apple-system, sans-serif" font-size="44" font-weight="bold" fill="#94a3b8" text-anchor="middle" dominant-baseline="middle">${initials}</text></svg>`;
      return {
        type: "BUFFER",
        buffer: Buffer.from(svg),
        mimeType: "image/svg+xml",
      };
    }

    const files = readdirSync(uploadDir)
      .filter((f) => !f.startsWith("."))
      .map((f) => ({
        name: f,
        time: statSync(resolve(uploadDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length === 0) {
      throw new NotFoundException("Profil fotoğrafı bulunamadı.");
    }

    const latestFile = files[0].name;
    const filePath = resolve(uploadDir, latestFile);
    const ext = extname(latestFile).toLowerCase();
    const mimeMap: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".webp": "image/webp",
      ".gif": "image/gif",
      ".heic": "image/heic",
      ".heif": "image/heif",
    };

    return {
      type: "STREAM",
      stream: createReadStream(filePath),
      mimeType: mimeMap[ext] || "image/jpeg",
    };
  }
}
