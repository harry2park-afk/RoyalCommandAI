import { redirect } from "next/navigation";

export const metadata = {
  title: "RCA Room",
  description: "Royal Command Australia Room",
};

export default function AustraliaV2TestRoom() {
  redirect("/rca-room");
}
