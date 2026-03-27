# Prompt: Skapa Word-dokument från oformaterad text i M-blankett-layout

Kopiera allt nedan och klistra in som prompt:

---

## PROMPT START

Jag har en oformaterad textmassa som jag vill att du formaterar och skriver ut som ett Word-dokument (.docx) med exakt samma layout som en svensk militär **M-blankett (Signal- och meddelandeblankett)**, formulärnummer **M7102-122460 Utg 3**.

### Blankettens layout (som Word-dokumentet ska efterlikna):

Dokumentet ska vara **A4, stående** och innehålla följande sektioner uppifrån och ner:

#### ÖVRE HUVUDDEL (header-tabellrad)
En rad med fält i tabellformat:
| Avd (motsv) | Avs sign | Framme senast | **SG** | Ev hemligbeteckning |

#### SEKTION "För sambandpersonalen" (vänster övre)
En inramad ruta till vänster med rubrik **"För sambandpersonalen"** innehållande:
- **Klassbet** | **Löpnr (serie)**
- **Signaladress/Till**
- *(tomt utrymme)*
- **Tidsnummer** | **Från (De)**
- **Adressmening**
- **Tjänsteanmärkning** | **Gruppantal**

#### IDENTIFIERINGSRAD
Fält i rad: **(Mynd/Avs)** | **(Datum)** | **(Beteckning)** | **(Sidnr)**

#### MEDDELANDEKROPP (huvuddelen)
En stor yta med **horisontella linjer** (ca 20+ rader) för fritext. Ytan är uppdelad i **tre kolumner** med horisontella linjer. Till vänster finns en vertikal linje som avgränsar ett smalt marginalfält.

**Det är i denna meddelandekropp som den fria texten jag ger dig ska placeras.**

#### NEDRE DEL - Bekräftelse och sändning
- Checkbox: **Vid X i rutan sänd** | Text: **BEKRÄFTA MED MOTTAGNINGSBEVIS** | Checkbox: **Vid X i rutan vänd**
- **Klassare**
- **Sänds med:** checkboxar för □ Tfn □ Ord □ Ra □ Post
- **Företrädesrätt** □
- □ Krypto □ Klartext □ Utför lösensignalering
- **Sign** ___
- **Kry/Dekry av** □ | **Gruppantal** | **Fskr**
- **Signalist** | **Lösen**
- □ Sänt □ Mott □ Rätt □ Fel
- □ Tfn □ ___ | **Kl** ___
- □ Ra □ ___ | **Sign** ___

### Instruktioner:

1. Skapa ett **komplett VBA-makro för Microsoft Word** som bygger upp layouten ovan från grunden (med tabeller, kantlinjer och textrutor).
2. Makrot ska också innehålla logik för att ta in de specifika "MIN TEXT ATT FYLLA I"-variablerna och placera in dem på rätt platser.
3. Jag kommer ange vilken del av min fria text som ska hamna i **meddelandekroppen** (den stora linjerade ytan).
4. Jag kan även ange värden för header-fält som Avd, Datum, Från, Till, SG etc.
5. Makrot ska sätta texten i meddelandekroppen till **monospace-stil (Courier New)** för att matcha originalet.
6. Alla rubriker och fältetiketter ska vara i **Arial eller Helvetica, fetstil** där det är lämpligt.
7. Vänligen ge mig hela VBA-koden (helst i en modul som kör 'Main') så att jag bara kan klistra in det i Word och köra.

### MIN TEXT ATT FYLLA I:

**Header-fält:**
- Avd (motsv): [FYLL I]
- Avs sign: [FYLL I]
- Framme senast: [FYLL I]
- SG: [FYLL I]
- Signaladress/Till: [FYLL I]
- Från (De): [FYLL I]
- Mynd/Avs: [FYLL I]
- Datum: [FYLL I]
- Beteckning: [FYLL I]

**Meddelandetext (fritext):**

[KLISTRA IN DIN OFORMATERADE TEXT HÄR]

## PROMPT END

---
