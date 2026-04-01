import SignInForm from "@/components/auth/SignInForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In | dafter Dashboard",
  description: "Access your dafter accounting dashboard",
};

export default function SignIn() {
  return <SignInForm />;
}
