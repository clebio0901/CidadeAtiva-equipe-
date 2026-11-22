# Cidade Ativa — Equipe

Frontend independente de operações urbanas em React, TypeScript e Vite. A demonstração usa ocorrências fictícias em Fortaleza. O painel e a lista refletem as alterações de status salvas no navegador deste dispositivo. O mapa usa Leaflet com OpenStreetMap e precisa de internet para carregar as ruas. Os detalhes incluem um link para o Google Maps.

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

