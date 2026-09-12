import { ImageResponse } from 'next/og';
import { readFileSync } from 'fs';
import { join } from 'path';

export const size = {
  width: 32,
  height: 32,
};

export const contentType = 'image/png';

export default function Icon() {
  const logoData = readFileSync(join(process.cwd(), 'public', 'logo.jpg'));
  const logoBase64 = `data:image/jpeg;base64,${logoData.toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
      >
        <img
          src={logoBase64}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '20%',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
