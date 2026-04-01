import RegisterBusinessForm from "@/components/auth/RegisterBusinessForm";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register Your Business | dafter",
  description: "Create your accounting management account with dafter",
};

export default function RegisterBusinessPage() {
  return <RegisterBusinessForm />;
}
