# Cidade Ativa — Equipe

Frontend independente de operações urbanas em React, TypeScript e Vite. A demonstração usa ocorrências fictícias e marcadores ilustrativos em Sumé-PB. O painel e a lista refletem as alterações de status salvas no navegador deste dispositivo. O mapa usa Leaflet com Esri World Imagery no modo Satélite e OpenStreetMap no modo Ruas. As duas camadas precisam de internet. Os detalhes incluem um link para o Google Maps.

## Executar no navegador

Requer Node.js 22.12 ou superior.

```sh
npm ci
npm run dev
```

Abra o endereço que o Vite imprimir no terminal. Use `npm run build` para verificar os tipos e gerar a pasta `dist`.

## Preparar para Android

Com Android Studio e o SDK configurados, execute:

```sh
npm run build
npx cap add android
npm run android:sync
npx cap open android
```

Execute `npx cap add android` na primeira configuração. Nas próximas alterações, `npm run android:sync` recompila e copia o frontend para o projeto Android. Use o Android Studio para gerar o APK. O identificador inicial do aplicativo é `br.com.cidadeativa.equipe`.

[Configuração do ambiente Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup)


## Google Maps

Para usar o Google Maps como fonte, habilite a Maps JavaScript API em um projeto do Google Cloud com faturamento ativo. Crie uma chave para navegador restrita à Maps JavaScript API e aos endereços do frontend. Para desenvolvimento local, inclua a origem local autorizada. Para produção, inclua o domínio do Netlify autorizado.

Defina `VITE_GOOGLE_MAPS_API_KEY` em `.env.local` para compilar na máquina, ou nas variáveis do Netlify se ele executar o build. Gere novamente `dist` antes de publicar. Em um deploy manual, a variável precisa estar disponível na máquina que executa `npm run build`. A chave de navegador fica visível no frontend compilado, por isso deve ser específica para esse uso e ter restrições próprias.

Sem a chave, o mapa usa Esri e OpenStreetMap. Ambos os modos permitem zoom via rolagem do mouse sobre o mapa, gestos de toque e os botões de zoom.

[Configuração da Maps JavaScript API](https://developers.google.com/maps/documentation/javascript/get-api-key)

## Demandas compartilhadas com o Administrador

Configure `VITE_CIDADE_ATIVA_API_URL` com a origem HTTPS do mesmo backend do Administrador, sem `/api` no final. Para uma publicação manual no Netlify, configure a variável no `.env.local` antes de executar `npm run build`. Sem essa variável, o frontend inicia no modo de demonstração.

Na hospedagem do backend, acrescente o domínio da Equipe em `CORS_ALLOWED_ORIGINS`, preservando os domínios já autorizados. A integração usa o login existente e as permissões de Gestor ou Administrador. O escopo atual inclui as demandas visíveis a essas contas. A API atual não associa um usuário de campo a uma equipe com permissão delimitada.

O frontend consulta `GET /api/ocorrencias` ao entrar, a cada 20 segundos enquanto a janela está visível e pelo botão Atualizar. Para salvar status, o backend precisa ter `PATCH /api/ocorrencias/{id}/status` aplicado e publicado. Essa rota atualiza somente o status, usa o banco existente e detecta mudanças concorrentes de status.

## Cadastro de funcionários

A seção Funcionários fica disponível em produção para Administradores. Ela lista contas com perfil Servidor e cadastra novas pela rota protegida `POST /api/usuarios/funcionarios`. A rota precisa ser publicada no mesmo backend do Administrador. O perfil Servidor identifica o funcionário de campo. O acesso de servidores às demandas operacionais depende de uma etapa de vínculo com a equipe e autorização no backend.
