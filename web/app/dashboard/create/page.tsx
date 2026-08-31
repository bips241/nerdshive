import { auth } from "@/auth"
import { redirect } from "next/navigation"
import CreatePage from "./create-post-form"




export default async function Create() {
    const session = await auth()
    if (!session?.user) {
      redirect("/login")
    }
    return <CreatePage/>
  }