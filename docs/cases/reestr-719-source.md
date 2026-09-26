# Эксперт Плюс (reestr-719.ru) — Source Record

Internal: true  
Public source: false

Структурированный source record по независимому техническому SEO-аудиту публичной версии reestr-719.ru. Все наблюдения датированы **26.09.2026** и не описывают автоматически состояние сайта после этой даты. `Public: yes` допускает использование записи в публичном кейсе, но не обязывает её публиковать.

## Project metadata

Project: Эксперт Плюс (reestr-719.ru)  
Site: https://reestr-719.ru/  
Work type: Independent SEO Audit / Work Sample  
Checked: 2026-09-26  
Primary source: собственный обход URL из XML-карты сайта в браузере (fetch + DOMParser по исходному HTML), выгрузка результатов в JSON  
Additional sources: ручные проверки в браузере (rendered DOM, `document.fonts`, `checkVisibility()`), DNS/HTTP-проверки отдельных адресов  
Access level: public-site-only; crawler; browser/live-page checks  
CMS/admin access: no  
Server access: no

CMS определена по публичным признакам HTML: `meta generator` WordPress и Elementor, комментарий Yoast SEO Premium, карта сайта Yoast. Внутренние настройки CMS не проверялись.

## Методика обхода

1. `robots.txt` → `Sitemap: https://reestr-719.ru/sitemap_index.xml`.
2. `sitemap_index.xml` → 8 дочерних карт: post (398), page (15), sp_faq (86), services (17), wpm-testimonial (37), category (23), faq_cat (19), wpm-testimonial-category (8). Итого 603 записи `<loc>`, 603 уникальных URL.
3. Каждый URL запрошен `fetch` (same-origin, `cache: no-store`), 4 параллельных потока; фиксировались статус, конечный URL, признак редиректа, заголовок `X-Robots-Tag`, Title, meta description, meta robots, canonical, H1, типы JSON-LD, объём текста, ссылки.
4. Из HTML 603 страниц извлечены все `a[href]` на домен reestr-719.ru (без `#`): 785 уникальных адресов. Адреса вне карты сайта, кроме `/wp-content/` (137 шт.), запрошены отдельно.
5. Второй проход по 603 страницам: для каждой ссылки на проблемный адрес зафиксированы страница-источник, анкор и контейнер (форма / контент).

Ограничение метода: `fetch` следует редиректам автоматически и не показывает промежуточные шаги и коды 301/302. Для редиректов подтверждены только факт перенаправления и конечный URL.

## FINDING-001 — ссылки на политику и согласие в формах ведут через редирект

Status: confirmed  
Public: yes  
Priority: medium  
Category: technical-seo / internal-links  
Checked: 2026-09-26

### Claim

В форме Contact Form 7 (`form.wpcf7-form`) ссылки `/privacy-policy` и `/soglasie-na-obrabotku-personalnyh-dannyh` указаны без завершающей косой черты и перенаправляются на версии со слешем, которые и находятся в карте сайта.

### Scope

603 страницы карты сайта. По 380 вхождений каждой ссылки на 378 страницах (на двух страницах форма выводится дважды). Итого 760 из 881 вхождения на редирект.

### Evidence

- URLs: `/privacy-policy` → `/privacy-policy/`; `/soglasie-na-obrabotku-personalnyh-dannyh` → `/soglasie-na-obrabotku-personalnyh-dannyh/`.
- DOM: ближайший контейнер ссылки — `FORM.wpcf7-form`.
- crawler: 380 + 380 вхождений.

### Recommendation

Исправить href в шаблоне формы на финальные URL со слешем (одна правка шаблона). Перепроверить обходом.

### Limitations

Тип редиректа (301/302) и число шагов не измерялись.

## FINDING-002 — ссылки в тексте статей ведут через редирект или на 404

Status: confirmed  
Public: yes  
Priority: medium (404 — выше)  
Category: technical-seo / internal-links

### Claim

Кроме форм, 121 вхождение ссылок в контенте на 65 страницах ведёт через редирект; 9 вхождений на 5 страницах ведут на HTTP 404.

### Evidence

- 58 уникальных адресов с редиректом: 52 отличаются от финального URL только отсутствием `/` (например, `/pp719` — 16 вхождений на 14 страницах), 6 — старые или изменённые адреса записей.
- `/pp-719/` (анкор «ПП 719», 2 страницы) перенаправляется на статью `/pp-719-bez-stressa-chto-volnuet-selhozproizvoditelej-i-kak-my-eto-reshaem/`, а не на страницу постановления `/pp719/` (Title: «Постановление Правительства РФ от 17.07.2015 № 719»).
- `/podgotovlena-novaya-redakcziya-pp-1875/` (навигация «Предыдущая/Следующая статья», `/sitemap/`) → `/prorabatyvayutsya-trebovaniya-svyazannye-s-importozameshheniem-v-2026-godu/`. На самой конечной странице ссылка «Предыдущая статья» ведёт через этот редирект обратно на неё же.
- 404: `/yslygi` (5 стр.), `/pomoshch-s-vneseniem-produkcii-v-reestr-produkcii-eaes` (2), `/v-reestr-minpromtorga-rossii-za-2-mesyaca` (1), `/pomoshch-s-vklyucheniem-tovarov-v-reestr-radioelektronnoj-produkcii` (1). Страницы-источники: `/pravitelstvo-usilivaet-kontrol-za-komplektuyushchimi-v-elektronike/`, `/329-milliardov-rublej-iz-byudzheta-na-podderzhku-rossijskih-predpriyatij/`, `/reestry-lokalizacii-rossijskoj-produkcii-i-softa-v-2024-godu-kakie-byvayut/`, `/vnesenie-po-v-reestr-mincifry/`, `/process-vneseniya-v-reestr-eaes-shag-za-shagom/`.

### Recommendation

Заменить href на финальные URL; для `/yslygi` и старых адресов услуг — на актуальные страницы `/services/.../`. Для `/pp-719/` — ссылку на `/pp719/`. Разобраться, почему запись «Подготовлена новая редакция…» доступна в навигации по адресу, который перенаправляет на другую статью.

### Limitations

Причина редиректа `/pp-719/` не установлена (возможен автоподбор WordPress для несуществующего адреса, но это не проверялось). Ссылки вне HTML страниц карты сайта (меню в JS, PDF) не анализировались.

## FINDING-003 — шрифты подключаются с технического домена хостинга

Status: confirmed  
Public: yes  
Priority: medium  
Category: performance / front-end

### Claim

HTML всех 603 проверенных страниц содержит URL шрифтов на технический домен `ce61589-wordpress-9o7mg.tw1.ru`. На главной три семейства, подключённые только оттуда, не загружаются (`FontFace.status = error`).

### Evidence

- HTML: строка `ce61589-wordpress` найдена на 603 из 603 страниц.
- DOM (главная): 39 правил `@font-face` с этим доменом, в основном из inline-стиля `cf-frontend-style-inline-css`, частично из `post-14.css` Elementor. Семейства: Montserrat (18 правил), Montserrat-Black (14), Baron Neue (5), Baron Neue Black (2).
- `document.fonts`: Montserrat-Black — 6 error, Baron Neue — 2 error, Baron Neue Black — 2 error; Montserrat загружается из другого источника.
- Использование на главной: Montserrat-Black — 58 текстовых элементов, Baron Neue — 13, Baron Neue Black — 3 (учитывались h1–h3, заголовки Elementor, p, a, span).
- Технический домен: `http://` открывает заглушку «Домен припаркован в Timeweb» (vh462.timeweb.ru); загрузка по `https://` в браузере не удалась.

### Recommendation

Перенести файлы шрифтов на основной домен (или подключать из используемого источника Montserrat), заменить URL в настройках плагина кастомных шрифтов и CSS Elementor, пересобрать CSS. Проверить, не осталось ли других ссылок на технический домен в базе данных.

### Limitations

Визуальное отличие от задуманного дизайна не оценивалось; вес и время запросов к недоступному домену не измерялись (cross-origin Resource Timing без `Timing-Allow-Origin` не показывает статус).

## FINDING-004 — дубли и пропуски meta description

Status: confirmed  
Public: yes  
Priority: low–medium  
Category: on-page

### Evidence

- Нет meta description: 100 из 603 URL. По типам: sp_faq 40/86, faq_cat 17/19, post 15/398, category 11/23, testimonial-category 8/8, testimonial 7/37, page 1/15, services 1/17 (архив `/services/`).
- Одинаковые описания: 17 групп, 46 URL. Крупнейшая — 14 записей с описанием, начинающимся «Новая инициатива Минпромторга РФ — премия «Молодой промышленник года»…», хотя темы записей разные (например, `/subsidii-za-adaptacziyu-rabochih-mest-dlya-lyudej-s-invalidnostyu/`, `/vneseny-pravki-v-federalnyj-zakon-n-44-fz/`, `/v-eaes-sozdadut-edinuyu-sistemu-kontrolya-proishozhdeniya-tovarov/`).

### Recommendation

Исправить 14 описаний в первую очередь; для таксономий FAQ и рубрик задать шаблон описания в Yoast.

### Limitations

Отсутствие description не запрещает индексацию; поисковик может сформировать сниппет сам.

## FINDING-005 — два H1 на страницах услуг, один скрыт

Status: confirmed  
Public: yes  
Priority: low  
Category: on-page / template

### Evidence

- HTML: 16 из 17 URL `services-sitemap.xml` содержат два H1.
- DOM `/services/zapolnenie-kataloga-v-gisp/`: первый H1 «Заполнение каталога товаров в ГИСП за 3 дня» внутри `div.hide-header` с `display: none`; второй «Заполнение каталога в ГИСП» — видимый заголовок Elementor. Проверено вручную на одной странице.
- Три страницы без H1 в HTML: `/about-us/`, `/o-nas-kompaniya-ekspert-plyus/`, `/pomoshh-v-poluchenii-sertifikata-deklaraczii-o-sootvetstvii/`; на `/about-us/` отсутствие подтверждено и в DOM после JS.

### Recommendation

Отключить вывод заголовка темы на шаблоне услуг (или сделать его не-H1) и оставить один видимый H1. Добавить H1 на три страницы.

## FINDING-006 — пагинация /pomoshch-eksperta/

Status: confirmed  
Public: yes  
Priority: low  
Category: indexability

### Evidence

- `/pomoshch-eksperta/page/2/` … `/page/45/`: `meta robots` `noindex,follow` и canonical на `/pomoshch-eksperta/`.
- `/pomoshch-eksperta/page/99/` (за пределами списка): HTTP 200, пустой список записей — soft 404. Для сравнения, `/category/expert/page/999/` и `/services/page/9/` отвечают 404, а архивы рубрик используют self-canonical.

### Recommendation

Для несуществующих страниц пагинации отдавать 404; привести canonical пагинации к одной схеме с архивами рубрик (self-canonical).

### Limitations

Индексация страниц пагинации в Яндексе/Google не проверялась.

## CHECK-001 — карта сайта и индексируемость

Status: not-confirmed  
Public: yes

603 URL, 0 повторов, 603 ответа HTTP 200 без редиректов, `index, follow` и canonical на себя на всех 603. Различие в 19 canonical — только кодирование символа «№» (`%e2%84%96`); после декодирования URL совпадают. Проблема не подтверждена.

## CHECK-002 — длинные Title

Status: not-confirmed (как ошибка)  
Public: yes

600 из 603 Title длиннее 70 символов, но главная причина — суффикс « | В реестр Минпромторга российской промышленной продукции» (≈58 символов), добавляемый Yoast. Это кандидат на пересмотр шаблона, а не ошибка.

## CHECK-003 — служебные ответы

Status: not-confirmed  
Public: yes

Несуществующий URL → 404 + `noindex`. `http://www.reestr-719.ru/services` → конечный `https://reestr-719.ru/services/`. `/PRIVACY-POLICY/` → 200 с canonical на нижний регистр. `/?s=test` → `noindex`. `/author/admin/` → главная. XML-карты отдают `X-Robots-Tag: noindex, follow` (штатно для Yoast).

## CHECK-004 — две страницы «О компании»

Status: hypothesis  
Public: no

`/about-us/` и `/o-nas-kompaniya-ekspert-plyus/` — обе в карте сайта, индексируемые, с разным текстом (2 общих предложения из 23). Возможна конкуренция за один интент; без данных о запросах и Вебмастера не утверждать.

## CHECK-005 — REST API пользователей

Status: confirmed (security, не SEO)  
Public: no

`/wp-json/wp/v2/users` отвечает 200 и отдаёт одну запись пользователя. В публичный кейс не переносить; при передаче аудита владельцу сайта — сообщить отдельно.

## RECHECK-001 — опечатки в адресах записей

Status: needs-recheck  
Public: no

Конечные адреса с вероятными опечатками: `/aczionalnyj-rezhim-otkryvaet-novye-vozmozhnosti-dlya-proizvoditelej-2026/`, `/ballnaya-sistema-loaklizaczii-dlya-lekarstv/`, `/gisp-dlya-rossikih-proizvoditelej-rekomendacii-po-rabote/`. Смена URL требует редиректов и влияет на накопленные сигналы; решать вместе с владельцем.
