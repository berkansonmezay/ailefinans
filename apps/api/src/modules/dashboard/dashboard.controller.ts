import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { DashboardService } from "./dashboard.service";
import { ActiveTenant } from "../../common/decorators";
import { TenantGuard } from "../../common/guards";
import { success } from "../../common/helpers";

@Controller("dashboard")
@UseGuards(AuthGuard("jwt"), TenantGuard)
export class DashboardController {
  constructor(private service: DashboardService) {}

  @Get("kpis")
  async getKPIs(
    @ActiveTenant() tenantId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const now = new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate
      ? new Date(endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return success(await this.service.getKPIs(tenantId, start, end));
  }

  @Get("monthly-chart")
  async getMonthlyChart(
    @ActiveTenant() tenantId: string,
    @Query("months") months?: string,
  ) {
    return success(
      await this.service.getMonthlyChart(
        tenantId,
        months ? parseInt(months) : 6,
      ),
    );
  }

  @Get("compare-years")
  async compareYears(
    @ActiveTenant() tenantId: string,
    @Query("years") years?: string,
  ) {
    const yearList = years ? years.split(',').map(y => parseInt(y)) : [new Date().getFullYear()];
    return success(
      await this.service.compareYears(tenantId, yearList)
    );
  }

  @Get("category-breakdown")
  async getCategoryBreakdown(
    @ActiveTenant() tenantId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("type") type: "INCOME" | "EXPENSE" = "EXPENSE",
  ) {
    const now = new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate
      ? new Date(endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return success(
      await this.service.getCategoryBreakdown(tenantId, start, end, type),
    );
  }

  @Get("merchant-breakdown")
  async getMerchantBreakdown(
    @ActiveTenant() tenantId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    const now = new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate
      ? new Date(endDate)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return success(
      await this.service.getMerchantBreakdown(tenantId, start, end),
    );
  }

  @Get("yearly-expenses")
  async getYearlyExpenses(
    @ActiveTenant() tenantId: string,
    @Query("year") year?: string,
  ) {
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    return success(
      await this.service.getYearlyExpenses(tenantId, targetYear)
    );
  }

  @Get("monthly-trends")
  async getMonthlyTrends(
    @ActiveTenant() tenantId: string,
    @Query("year") year?: string,
  ) {
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    return success(
      await this.service.getMonthlyTrends(tenantId, targetYear)
    );
  }
}
