# DreamLife Frakcje — cichy bot pojazdów

Bot do posegregowania pojazdów na Discordzie według pięciu istniejących kanałów. W **zwykłym trybie nic nie publikuje i niczego nie zmienia**: nie ma komend publikujących, wysyłania wiadomości, embedów, webhooków ani tworzenia kanałów.

Kanały pozostają w takim samym układzie: 🚙 | off-road, 🚘 | sedany, 🏎️ | coupe, 🏁 | musclecar, 🏎️ | pojazdy-sportowe. Opcjonalny Burrito jest zapisany w danych jako pojazd transportowy, ale bot nie zakłada dla niego kanału.

Lista 50 nazw w pliku data/vehicles.json to **roboczy podział wymagający sprawdzenia** wobec aktualnej oferty Noisiak Store: https://store.noisiak.com/category/2957657 . Bot nie kopiuje automatycznie cen ani obrazów i nie publikuje tej listy.

## Railway
Usługa powinna startować przez npm start na Node.js 20+.

Dodaj prywatnie w Railway > Variables:
- DISCORD_BOT_TOKEN — token aplikacji Discord, nigdy nie wpisuj go do repozytorium.
- DISCORD_GUILD_ID — ID docelowego serwera Discord.
- DISCORD_APPLICATION_ID — domyślnie 1570864803789144213 (opcjonalnie).

Po ustawieniu zmiennych bot odczytuje listę kanałów na starcie i co 30 minut. W logach wyświetla dopasowania. W /health można sprawdzić stan. Bez tokenu działa w trybie setup_required, ale nadal nie wysyła wiadomości.

Wystarczy View Channels do odczytu kanałów. Uprawnienie Manage Channels jest potrzebne WYŁĄCZNIE do osobnej, opcjonalnej zmiany emoji.

## Polecenia
- npm start — bezpieczny, zawsze tylko do odczytu bot na Railway.
- npm run preview — jednorazowy podgląd i koniec.
- npm run rename:preview — podgląd propozycji emoji.
- npm run rename:apply — **ręczna** edycja istniejących nazw, zmienia WYŁĄCZNIE emoji przed kreską; zachowuje resztę nazwy, nie dotyka uprawnień ani żadnych wiadomości.
- npm test — testy katalogu, rozpoznawania kanałów i ochrony nazw.

Projekt społecznościowy do FiveM / RP, nieoficjalny względem sklepu Noisiak.
