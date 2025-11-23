import CouponForm from "../coupon-form";

export default function NewCouponPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Nuevo Cupón</h1>
                <p className="text-muted-foreground">
                    Crea un código de descuento para tus clientes.
                </p>
            </div>
            <CouponForm />
        </div>
    );
}
