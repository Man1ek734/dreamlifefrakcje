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

## Galeria aut ze zdjęciami

Pełne 53 modele z kategorii Noisiak Store są w `data/product_gallery.json`. Dodatkowa kategoria `pojazdy-transportowe` mieści Burrito. Przy uruchomieniu bot tworzy (albo odnajduje) kategorię `━━ 🚘・POJAZDY FRAKCYJNE ━━` i sześć kanałów, zachowując istniejące nazwy. Każdy model wysyła jako osobny wpis: ramka z nazwą oraz rzeczywiste zdjęcia od autora (1–3 obrazy, zależnie od dostępności). Obrazki są kompresowane do JPEG i publikowane jako załączniki, dzięki czemu Discord układa je obok siebie. Wpisy nie są duplikowane po restarcie; sprawdzane są wiadomości własnego bota.

Status online bota pozostaje bez widocznej aktywności tekstowej.

## Bez duplikowania kategorii (2026-11-13)

Bot nie tworzy juz zadnych nowych kanalow pojazdow. Korzysta wylacznie z pierwszego kompletu szesciu kanalow o zapisanych identyfikatorach. Kanaly powielone przez poprzednia wersje (wewnatrz kategorii POJAZDY FRAKCYJNE) sa automatycznie usuwane. Oryginalne wpisy zachowuja zalaczniki ze zdjeciami, bot tylko dopisuje w tresci ceny IC. Jesli brakuje wpisu, zostanie wyslany jedynie do oryginalnego kanalu. Cennik mozna edytowac w data/prices_ic.json; sa to ceny wirtualne wewnatrz gry, nie ceny realne sklepu.

## Tickety i usuwanie duplikatow (2026-11-13)

W katalogu zostaje tylko pierwszy komplet szesciu kanalow; 12 znanych duplikatow poprzedniego bota jest usuwanych po starcie. Bot nie tworzy ponownie kategorii zakupow ani kanalow pojazdow. Ceny IC wszystkich 53 pojazdow zwiekszono o 15% i zaokraglono do 100 $. Edycja postow nie usuwa ich fotografii.

Nowe tickety maja nazwy `ticket-1`, `ticket-2` itd. Nastepny numer jest rezerwowany i zapisywany w temacie istniejacego kanalu panelu (pole `dlshop-next:N`), dlatego nie resetuje sie po zamknieciu ticketu ani po restarcie bota. Kazdy czlonek majacy dostep do ticketu moze go zamknac przyciskiem po potwierdzeniu.
