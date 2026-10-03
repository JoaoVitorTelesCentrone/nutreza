(() => {
  const root = document.getElementById("offline-app");
  const match = location.pathname.match(/\/paciente\/(?:plano|diario|progresso)\/([0-9a-f-]{36})/i);
  const requestedPatientId = match && match[1];
  const open = indexedDB.open("nutreza-paciente", 2);
  open.onerror = () => { root.textContent = "Não encontramos dados offline neste aparelho. Reconecte-se para atualizar."; };
  open.onsuccess = () => {
    const db = open.result;
    const identityStore = db.transaction("identidade-cache").objectStore("identidade-cache");
    const identityRequest = requestedPatientId ? identityStore.get(requestedPatientId) : identityStore.getAll();
    identityRequest.onsuccess = () => {
      let identity = requestedPatientId ? identityRequest.result : (identityRequest.result || [])[0];
      if (!requestedPatientId && (identityRequest.result || []).length > 1) {
        root.replaceChildren();
        const heading = document.createElement("h1"); heading.textContent = "Escolha seu perfil"; root.append(heading);
        (identityRequest.result || []).forEach((profile) => { const link = document.createElement("a"); link.href = "/paciente/diario/" + profile.patientId; link.textContent = profile.patientName || "Abrir diário"; link.style.cssText = "display:block;padding:1rem;background:white;border-radius:12px;margin:.5rem 0;color:#2e7d5b"; root.append(link); });
        return;
      }
      if (!requestedPatientId && identity) history.replaceState(null, "", "/paciente/plano/" + identity.patientId);
      if (!identity) { root.textContent = "Não encontramos uma sessão offline para este paciente. Reconecte-se."; return; }
      const patientId = identity.patientId;
      root.replaceChildren();
      const title = document.createElement("h1"); title.textContent = "Modo offline · " + (identity.patientName || "Área do paciente"); root.append(title);
      const status = document.createElement("p"); status.textContent = "O conteúdo salvo pode estar desatualizado. A conexão é necessária para confirmar alterações recentes do plano."; root.append(status);
      const planRequest = db.transaction("planos-cache").objectStore("planos-cache").get(patientId);
      planRequest.onsuccess = () => {
        const saved = planRequest.result;
        if (saved && saved.userId === identity.userId && Date.now() - saved.savedAt < 24 * 60 * 60 * 1000) {
          const plan = saved.plan;
          const heading = document.createElement("h2"); heading.textContent = plan.title + " · versão " + plan.version; root.append(heading);
          const date = document.createElement("p"); date.textContent = "Aprovado em " + new Date(plan.approvedAt).toLocaleDateString("pt-BR"); root.append(date);
          if (plan.objective) { const objective = document.createElement("p"); objective.textContent = plan.objective; root.append(objective); }
          (plan.meals || []).forEach((meal) => {
            const section = document.createElement("section"); section.style.cssText = "background:white;border:1px solid #dce6dd;border-radius:16px;padding:1rem;margin:1rem 0";
            const mealName = document.createElement("h3"); mealName.textContent = meal.name + (meal.time ? " · " + meal.time.slice(0, 5) : ""); section.append(mealName);
            (meal.items || []).forEach((item) => {
              const line = document.createElement("p"); line.textContent = item.name + " · " + item.amount + (item.notes ? " · " + item.notes : ""); section.append(line);
              (item.alternatives || []).forEach((alt) => { const altLine = document.createElement("p"); altLine.style.cssText = "color:#667a70;font-size:.9rem"; altLine.textContent = "Alternativa aprovada: " + alt.name + " · " + alt.amount; section.append(altLine); });
            });
            root.append(section);
          });
        } else {
          const expired = document.createElement("p"); expired.textContent = "A cópia offline expirou ou não existe. Conecte-se para consultar a versão aprovada mais recente."; root.append(expired);
        }
        const form = document.createElement("form"); form.style.cssText = "background:white;border:1px solid #dce6dd;border-radius:16px;padding:1rem;margin-top:1rem";
        form.innerHTML = '<h2>Registrar refeição</h2><label>Refeição<select name="refeicao" style="display:block;width:100%;padding:.7rem;margin:.5rem 0 1rem"><option value="cafe">Café da manhã</option><option value="lanche_manha">Lanche da manhã</option><option value="almoco">Almoço</option><option value="lanche_tarde">Lanche da tarde</option><option value="jantar">Jantar</option><option value="ceia">Ceia</option><option value="outro">Outro</option></select></label><label>Alimentos e porções<textarea name="itens" rows="4" style="display:block;width:100%;padding:.7rem;margin:.5rem 0 1rem" placeholder="Um item por linha"></textarea></label><label>Observação<textarea name="descricao" rows="2" style="display:block;width:100%;padding:.7rem;margin:.5rem 0 1rem"></textarea></label><button style="padding:.8rem 1rem;background:#2e7d5b;color:white;border:0;border-radius:12px;font-weight:700">Guardar neste aparelho</button><p role="status"></p>';
        form.onsubmit = (event) => {
          event.preventDefault();
          const formData = new FormData(form);
          const entry = { id: crypto.randomUUID(), patientId, userId: identity.userId, refeicao: formData.get("refeicao"), consumidoEm: new Date().toISOString(), descricao: String(formData.get("descricao") || "").slice(0, 2000), itens: String(formData.get("itens") || "").split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 30).map((s) => { const parts = s.split("—", 2); return { nome: parts[0].slice(0, 120), quantidade: (parts[1] || "").slice(0, 80) }; }), compartilhado: false, createdAt: Date.now() };
          const tx = db.transaction("diario-pendente", "readwrite"); tx.objectStore("diario-pendente").put(entry);
          tx.oncomplete = () => { form.querySelector('[role="status"]').textContent = "Registro salvo neste aparelho. Abra a área quando estiver online para sincronizar."; form.reset(); };
          tx.onerror = () => { form.querySelector('[role="status"]').textContent = "Não foi possível salvar. O armazenamento deste aparelho pode estar cheio."; };
        };
        root.append(form);
      };
    };
  };
})();
