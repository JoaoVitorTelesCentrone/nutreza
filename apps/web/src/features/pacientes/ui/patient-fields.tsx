type Patient = { nome: string; nascimento: string | null; sexo: string | null; email: string | null; telefone: string | null };

export function PatientFields({ patient }: { patient?: Patient }) {
  return <div className="grid gap-5 sm:grid-cols-2">
    <div className="sm:col-span-2"><label className="form-label" htmlFor="nome">Nome completo *</label><input className="field" id="nome" name="nome" required minLength={2} maxLength={160} defaultValue={patient?.nome}/></div>
    <div><label className="form-label" htmlFor="nascimento">Data de nascimento</label><input className="field" id="nascimento" name="nascimento" type="date" defaultValue={patient?.nascimento ?? ""}/></div>
    <div><label className="form-label" htmlFor="sexo">Sexo</label><select className="field" id="sexo" name="sexo" defaultValue={patient?.sexo ?? ""}><option value="">Não informado</option><option value="feminino">Feminino</option><option value="masculino">Masculino</option><option value="outro">Outro</option><option value="nao_informado">Prefere não informar</option></select></div>
    <div><label className="form-label" htmlFor="email">Email</label><input className="field" id="email" name="email" type="email" maxLength={180} defaultValue={patient?.email ?? ""}/></div>
    <div><label className="form-label" htmlFor="telefone">Telefone</label><input className="field" id="telefone" name="telefone" type="tel" maxLength={30} defaultValue={patient?.telefone ?? ""}/></div>
  </div>;
}
