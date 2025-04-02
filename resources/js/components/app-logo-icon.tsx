import type { ImgHTMLAttributes } from "react"
import aicomLogo from "@/assets/aicom-logo.png" // Adjust path accordingly
import logo from "@/img/logo.jpg.png" // Adjust path accordingly

export default function AppLogoIcon(props: ImgHTMLAttributes<HTMLImageElement>) {
  return <img {...props} src={logo} alt="AICOM Logo" className="h-[50px]  w-[500px]" />
}
