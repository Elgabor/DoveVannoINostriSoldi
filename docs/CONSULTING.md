# Form di consulenza

La pagina `/consulenza` invia richieste testuali a Resend e alla casella del progetto. Non crea
un database applicativo di contatti e non espone le credenziali al browser.

## Configurazione obbligatoria

- `RESEND_API_KEY`: chiave con solo permesso di invio e, quando possibile, limitata al dominio;
- `RESEND_FROM_EMAIL`: mittente appartenente a un dominio verificato in Resend;
- `LEAD_INBOX_EMAIL`: destinatario gestito dal titolare indicato in `/privacy`.

Se manca `RESEND_API_KEY`, l'endpoint risponde `503`. Inbox e mittente usano i valori del
progetto quando le variabili sono vuote; un indirizzo configurato ma non valido resta un errore.
Le richieste a Resend hanno timeout e `Idempotency-Key`; un retry dello stesso contenuto non deve
produrre una seconda email nell'arco supportato dal provider.

## Controlli applicativi e limite dichiarato

L'endpoint accetta solo JSON same-origin, limita il corpo a 16 KiB e valida campi, consenso e
honeypot. Questi controlli non costituiscono un rate limit distribuito e non fermano un client che
imita una richiesta lecita. In produzione va configurata una regola WAF per `/api/consulenza`,
partendo in modalità log e scegliendo la soglia dopo aver osservato traffico reale e falsi positivi.

## Operazioni privacy

Il titolare deve mantenere una procedura verificabile per cancellare le richieste dalla casella e
da Resend entro il periodo dichiarato nella pagina privacy, gestire le richieste degli interessati e
conservare il DPA del provider. Prima di cambiare provider, inbox, periodo o scopo vanno aggiornati
informativa, test e configurazione nello stesso rilascio.

Fonti operative:

- [Resend: idempotency keys](https://resend.com/docs/dashboard/emails/idempotency-keys)
- [Resend: data residency](https://resend.com/docs/dashboard/domains/regions)
- [Resend: GDPR e DPA](https://resend.com/security/gdpr)
- [Vercel WAF custom rules](https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules)
