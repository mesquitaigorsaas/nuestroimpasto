# Nuestro Impasto

**La comunidad de los que hacen masa.** Rede social de vídeo para pizzaiolos, profissionais de massas, panificação e fermentação — experiência inspirada no YouTube, com identidade própria.

Desenvolvido por [Mesquita SaaS](https://mesquitasaas.online/).

## Rodando localmente

Requer **Node.js 24+** (usa o `node:sqlite` embutido).

```bash
npm install
npm run seed   # cria data/nuestro.db com dados de demonstração (apaga os dados atuais)
npm run dev    # http://localhost:3000
```

Contas de demonstração (senha `impasto123`):

| Conta | Papel |
|---|---|
| admin@nuestroimpasto.com | Administrador |
| marco@demo.com | Profissional verificado |
| ana@demo.com | Estudante verificada |
| lucas@demo.com · carla@demo.com · joao@demo.com | Membros com verificação pendente |

Todas as pessoas, canais e vídeos de demonstração são fictícios. Os vídeos de exemplo não têm arquivo — publique um vídeo real pelo Estúdio.

## Arquitetura

- **Next.js 16 (App Router) + TypeScript + Tailwind 4**: páginas renderizadas no servidor, Server Actions para mutações.
- **Banco**: SQLite local (`src/lib/db.ts`, esquema em `src/lib/schema.ts`), com busca de texto completo FTS5 que ignora acentos. SQL escrito para migrar para Postgres (Supabase).
- **Arquivos** (`src/lib/storage.ts`): interface `StorageProvider`; hoje grava em `data/uploads`. Em produção: Cloudflare R2/Stream, Bunny Stream ou Mux. Vídeos são servidos com suporte a *Range* (`/media/...`); documentos de verificação ficam em `private/` e só são acessados por admins (`/api/admin/document/[id]`, com registro de acesso).
- **Autenticação**: sessões em cookie `httpOnly`; senhas com `scrypt`; o banco guarda só o hash do token de sessão.
- **Miniaturas e duração** são extraídas no navegador (canvas) — não há servidor de vídeo no MVP.

### Mapa de pastas

```
src/app/(main)        páginas com o layout do app (Home, vídeo, canal, busca, feeds, estúdio, admin…)
src/app/(auth)        login e cadastro
src/app/api           upload e documento de verificação
src/actions           Server Actions (auth, vídeos, comentários, social, perfil, verificação, admin)
src/lib               banco, consultas, autenticação, armazenamento, formatação
src/lib/verification  verificação inteligente (provedores de evidência, fraude, análise por IA, política)
src/components        UI reutilizável (shell, cards, comentários, estúdio, social)
scripts/seed.mts      dados de demonstração
```

## Verificação inteligente

Fluxo: candidato → coleta de evidências → análise automática → classificação de confiança → aprovação automática (se habilitada) **ou** revisão humana → decisão → histórico.

- **Provedores de evidência** (`src/lib/verification/providers.ts`): dados declarados, vínculo com empresa, vínculo acadêmico, site/portfólio, Instagram, comprovante e dados da conta. Cada evidência tem `id`, origem e marca `confirmed` (declarado × confirmado). Novas fontes entram em `PROVIDERS`.
- **Sinais de risco** (`fraud.ts`): Instagram repetido em outra conta, tentativas repetidas, recusa recente, nome divergente, conta suspensa. Nunca bloqueiam sozinhos — encaminham para revisão.
- **Análise** (`analysis.ts`, `VerificationAnalysisService`):
  - com `ANTHROPIC_API_KEY`: Claude (`claude-opus-5`) como *analista de evidências*, com saída estruturada (JSON Schema) e *fallback* automático do servidor em caso de recusa;
  - sem chave (ou se a IA falhar): analisador por regras `rules-v1`.
  - Em ambos, sinais que citam evidências inexistentes são descartados; a análise nunca reprova — no máximo pede mais informações ou revisão humana. Seguidores/popularidade não são critério.
- **Política** (`index.ts`): alta confiança → aprovação automática (chave em Admin → Verificações, desligada por padrão) ou revisão rápida; média → fila; baixa → pedido de mais informações ao candidato; inconsistente ou com risco → revisão obrigatória.
- **Histórico** (`verification_events`): decisão, data, responsável, motivo, resultado e versão do analisador, evidências citadas.
- **Privacidade**: consentimento registrado com data; comprovante apagado após a decisão final; documentos nunca públicos.

### Instagram

Não há scraping. O perfil informado é tratado como **declarado**. A integração oficial (API da Meta com login do Instagram — contas profissionais, app Meta aprovado, OAuth com consentimento do usuário) está prevista na interface `InstagramOfficialClient` em `providers.ts`. Enquanto nenhuma implementação for registrada, o botão "Conectar Instagram" não aparece. Para ativar: criar e aprovar o app Meta, implementar o cliente (rota de OAuth + busca de campos oficiais mínimos) e registrar em `instagramOfficialClient`.

## Variáveis de ambiente

Veja `.env.example`.

| Variável | Uso |
|---|---|
| `ANTHROPIC_API_KEY` | Ativa a análise de verificação por IA |
| `VERIFICATION_AI=off` | Força o analisador por regras |

## Para produção (próximos passos)

1. Banco Postgres (Supabase) no lugar do SQLite — trocar `src/lib/db.ts` e a busca FTS5 por `tsvector`.
2. Armazenamento de vídeo gerenciado (Bunny Stream / Cloudflare Stream / Mux) implementando `StorageProvider`, com transcodificação e upload direto por URL assinada.
3. Hospedagem (Vercel, Render ou Railway) e domínio.
4. E-mail transacional (confirmação de conta, recuperação de senha).
5. Revisão jurídica da Política de Privacidade e dos Termos.

## Roadmap

- **Fase 2**: Shorts, playlists/coleções, busca técnica avançada, melhores recomendações, integração oficial do Instagram.
- **Fase 3**: algoritmo avançado, comunidades, eventos, transmissões ao vivo.
