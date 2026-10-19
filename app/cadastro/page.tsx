import { redirect } from "next/navigation";

// NEU-161: nao existe mais cadastro separado — quem nao tem conta ganha uma no
// mesmo passo do codigo. A rota continua existindo porque esta em link antigo e
// em QR ja impresso; ela so leva para o /login.
export default function CadastroPage() {
  redirect("/login");
}
