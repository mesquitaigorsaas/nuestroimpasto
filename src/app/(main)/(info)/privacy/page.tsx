export const metadata = { title: "Privacidade" };

export default function PrivacyPage() {
  return (
    <>
      <h1 className="title-tricolore">Política de Privacidade</h1>
      <p className="text-sm">Versão de lançamento (MVP). Este texto deve ser revisado por um profissional jurídico antes da abertura ao público.</p>
      <h2>Dados que coletamos</h2>
      <ul>
        <li>Conta: nome, @, e-mail e senha (armazenada com hash; nunca em texto).</li>
        <li>Perfil público: foto, capa, bio, especialidade, localização no nível que você escolher e links.</li>
        <li>Atividade: vídeos, comentários, curtidas, seguidores, itens salvos e histórico de exibição.</li>
        <li>Verificação: os dados informados no formulário, perfis e sites que você indicar e, se enviado, um comprovante.</li>
      </ul>
      <h2>Verificação de perfil</h2>
      <ul>
        <li>Os dados de verificação são usados exclusivamente para confirmar sua identidade e seu vínculo com a área.</li>
        <li>Uma análise automatizada assistida por inteligência artificial organiza as evidências e sugere uma ação; casos com dúvida são decididos por uma pessoa da equipe. A IA não reprova ninguém sozinha.</li>
        <li>Não fazemos coleta automatizada (scraping) de redes sociais. Perfis informados são tratados como declarações; integrações futuras usarão apenas APIs oficiais, com seu consentimento.</li>
        <li>Comprovantes ficam em armazenamento privado, são acessados somente pela equipe de verificação (com registro de acesso) e são apagados após a decisão.</li>
        <li>Registramos a data do seu consentimento e o histórico das decisões.</li>
      </ul>
      <h2>Seus direitos (LGPD)</h2>
      <p>
        Você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados, e revogar consentimentos, pelo contato da equipe. Contas excluídas têm
        seus conteúdos removidos.
      </p>
      <h2>Compartilhamento</h2>
      <p>Não vendemos dados. Usamos provedores de infraestrutura (hospedagem, armazenamento de vídeo e análise por IA) apenas para operar o serviço.</p>
    </>
  );
}
