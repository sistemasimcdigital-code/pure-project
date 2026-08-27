# Nova

Plataforma de catálogo e reprodução de doramas licenciados (K-Dramas, J-Dramas, C-Dramas) para
**assinantes autorizados externamente**. A Nova **não cobra assinatura**: o pagamento acontece no
canal externo do proprietário (ex.: Assinaturas da página do Facebook) e o acesso interno é liberado
por código de ativação ou ativação administrativa.

## Instalação local

```bash
bun install
bun run dev      # ambiente de desenvolvimento
bun run build    # build de produção
```

## Variáveis de ambiente

Copie `.env.example` para `.env` (o `.env` está no `.gitignore` e nunca deve ser versionado).

| Variável | Onde | Observação |
| --- | --- | --- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend | públicas por natureza; a proteção real é o RLS |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | servidor | usadas em funções de servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | servidor | segredo; nunca no frontend nem no repositório |

## Banco de dados e migrações

As migrações ficam em `supabase/migrations/` e são aplicadas pelo fluxo do projeto (backend
gerenciado). Estrutura principal:

- `series`, `seasons`, `episodes` — catálogo (`published`, `is_premium`, `content_rating`,
  `language`, `subtitle_languages`, `license_note`).
- `watch_progress` — progresso isolado por `auth.uid()`.
- `subscriptions` — acesso premium (`active`, `suspended`, `expired`, `cancelled`), origem,
  início, expiração. Índice único garante apenas um acesso ativo por conta.
- `activation_codes` — apenas `code_hash` (SHA-256) e `code_last4`; o código completo aparece
  uma única vez na criação.
- `subscription_audit_log` — criação, resgate, ativação, suspensão, cancelamento e falhas.
- `user_roles` + `has_role()` — papéis. **Não há autoelevação**: apenas um administrador já
  autorizado concede o papel de administrador.

### Segurança do catálogo

`video_url` e `media_path` **não** são legíveis pela API (grant por coluna). A mídia só é obtida
via `get_episode_media(episode_id)`, que exige assinatura ativa (ou papel de administrador) e é
avaliada no banco — o frontend não decide o acesso.

## Storage

Prefira um bucket **privado** para mídia e URLs temporárias/assinadas. O painel administrativo
alerta quando a URL informada não pertence ao storage autorizado do projeto. Nunca coloque vídeos
em `public/` ou no bundle.

## Primeiro administrador (seguro)

Não existe botão de autoelevação. Crie o primeiro administrador executando, no ambiente
administrativo do banco (fora do fluxo público):

```sql
insert into public.user_roles (user_id, role)
select id, 'admin' from auth.users where email = 'admin@seudominio.com'
on conflict do nothing;
```

Depois disso, novos administradores são concedidos apenas por um administrador existente.

## Códigos de ativação

1. Admin → aba **Códigos** → "Gerar código" (opcional: dias de acesso e observação).
2. O código completo é exibido **uma única vez**, com botão de copiar. Só o hash fica no banco.
3. O assinante acessa `/activate`, informa o código e recebe acesso ativo.
4. Cada código é resgatável **uma única vez** e não pode ser reutilizado por outra conta.
5. Códigos disponíveis podem ser revogados; tentativas inválidas são limitadas (8 por 15 minutos).

## Ativação e suspensão manual

Admin → aba **Assinantes**: busca por e-mail, ativa (com expiração opcional), suspende ou cancela.
Ações destrutivas exigem confirmação e tudo fica registrado no log de auditoria.

## Integração externa futura

O modelo já está preparado para sincronização automática: `subscriptions.source` e
`external_reference` aceitam origem/identificador externos. Quando houver API/webhook oficial,
crie uma rota `src/routes/api/public/...` que verifique a assinatura do provedor e atualize
`subscriptions` + `subscription_audit_log`. **Não há integração com o Facebook implementada.**

## Checklist de lançamento

- [ ] `.env` fora do Git e variáveis de produção configuradas
- [ ] Migrações aplicadas e políticas RLS revisadas
- [ ] Primeiro administrador criado pelo procedimento acima
- [ ] Catálogo com mídia licenciada (sem vídeos de demonstração)
- [ ] Dados de exemplo (`is_sample_data`) substituídos ou removidos
- [ ] Bucket privado de mídia configurado
- [ ] Redirecionamentos de autenticação (domínio de produção) configurados
- [ ] Teste completo: cadastro → ativação por código → reprodução → suspensão
