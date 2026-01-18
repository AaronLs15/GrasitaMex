import { NextRequest, NextResponse } from 'next/server';
import { testemail } from '@/lib/email';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const to = 'aaronlujano15@gmail.com';
        await testemail(to);

        return NextResponse.json({
            success: true,
            message: `Correo de prueba enviado a ${to}`,
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Error sending test email:', error);
        return NextResponse.json(
            {
                success: false,
                error: error.message,
                details: 'Verifica tus credenciales SMTP en el archivo .env'
            },
            { status: 500 }
        );
    }
}
