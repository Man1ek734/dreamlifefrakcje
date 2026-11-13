# DreamLife Frakcje — bot zakupowy Discord

Bot jest połączony z Discord Gateway i zgłasza status online. W podanym serwerze automatycznie próbuje skonfigurować kategorię zakupową i pojedynczy panel ticketów.

## Kanały

- Kategoria: ━━ 🛒・ZAKUPY ━━
- Kanał: 📩│stwórz-ticket
- Jeden panel w kolorze niebieskim DreamLife z przyciskiem Stwórz ticket
- W nowym tickecie wiadomość powitalna i przycisk Zamknij ticket (z potwierdzeniem usunięcia)
- Brak zmian w kanałach off-road, sedany, coupe, musclecar i pojazdy-sportowe

Panel wysyłany jest tylko przy pierwszym uruchomieniu, jeśli w kanale nie istnieje już wiadomość bota z aktywnym przyciskiem. Kolejne wdrożenia nie powinny wysyłać duplikatów.

## Konfiguracja Railway

Zapisz prywatnie w Variables:
- DISCORD_TOCKEN lub DISCORD_BOT_TOKEN — token Discorda. Nie publikuj go na GitHubie.
- DISCORD_GUILD_ID — 1570858701710032988
- DISCORD_TICKET_STAFF_ROLE_ID — opcjonalnie ID roli obsługi, która ma dostęp do prywatnych ticketów.

Zaproszenie z minimalnymi wymaganymi uprawnieniami (Manage Channels, View Channels, Send Messages, Embed Links, Read Message History):
https://discord.com/oauth2/authorize?client_id=1570864803789144213&scope=bot&permissions=85008&guild_id=1570858701710032988&disable_guild_select=true

Jeśli bot jest online, ale logi zwracają 403, trzeba dodać go na wskazany serwer lub nadać dostęp. Ponawia próbę co 2 minuty.

## Polecenia

- npm start — bot online i setup zakupów
- npm run preview — odczyt istniejących kanałów bez zmian
- npm run rename:preview — podgląd możliwych zmian emoji
- npm run rename:apply — ręczna zmiana samych emoji w nazwach kanałów z kategoriami aut
- npm test — testy

Lista pojazdów w data/vehicles.json pozostaje robocza, bez automatycznej publikacji.
