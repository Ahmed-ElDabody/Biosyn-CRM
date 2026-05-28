import Image from "next/image";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const initialError =
    params.error === "admin_only"
      ? "This dashboard is for admin users only."
      : undefined;

  return (
    <div className="min-h-screen flex items-center justify-center bg-biosyn-paper px-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-biosyn-navy rounded-2xl p-5 mb-4">
            <Image
              src="/biosyn-logo.png"
              alt="Biosyn"
              width={140}
              height={40}
              priority
              className="brightness-0 invert"
            />
          </div>
          <p className="text-sm text-biosyn-navy/70 italic">
            A Commitment Towards Better Health
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8 border border-biosyn-navy/10">
          <h1 className="text-2xl font-semibold text-biosyn-navy mb-1">Admin sign in</h1>
          <p className="text-sm text-biosyn-navy/60 mb-6">
            Access the Biosyn CRM dashboard.
          </p>
          <LoginForm next={params.next ?? "/admin"} initialError={initialError} />
        </div>
      </div>
    </div>
  );
}
