# Origem do módulo PWA

Copiado de `https://github.com/leonardocandiani/pwa-nativo`, commit `8159c5a`
(26/10/2026), licença MIT (`LICENSE`).

O que veio e para onde foi:

| No repo | Aqui |
|---|---|
| `skills/pwa-nativo/SKILL.md` | `README.md` |
| `skills/pwa-nativo/references/` | `references/` |
| `templates/` | `templates/` |
| `scripts/auditar.mjs`, `scripts/regras.mjs` | `scripts/` |
| `testes/` (com fixtures bom e ruim) | `testes/` |
| `commands/*.md` | `fluxos/*.md` |
| `agents/auditor-pwa.md` | `fluxos/auditor-pwa.md` |

Ficou de fora: `install.sh`, `.claude-plugin/`, README do repo e `.engenheiro-senior/`
(eram do pacote do plugin, nao do metodo).

Atualizar quando o repo mudar:

```bash
gh repo clone leonardocandiani/pwa-nativo /tmp/pwa-nativo -- --depth 1
diff -r /tmp/pwa-nativo/skills/pwa-nativo/references references
diff -r /tmp/pwa-nativo/templates templates
diff -r /tmp/pwa-nativo/scripts scripts
```

Copiar o que mudou, refazer a troca de `${CLAUDE_PLUGIN_ROOT}` pelo caminho da skill,
rodar `npm run pwa` na raiz da skill e registrar no `CHANGELOG.md`.
