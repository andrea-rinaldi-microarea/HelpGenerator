# helpgen

Questo progetto permette la generazione di informazioni utili agli sviluppatori riguardanti:

- Le strutture delle **tabelle**
- Le **enumerazioni**
- I **documenti** relativi al gestionale **Mago**

## Funzionamento

Il tool analizza i **repository locali** installati sulla macchina dell'utente, dai quali vengono prelevati i **metadati** scandagliando i diversi file.

Come risultato, viene generato un file chiamato `BusinessObjects.sam` che può essere aperto con il programma **SuperSam**, dal quale si può generare un output **HTML** dei dati estratti.

---

## Istruzioni

Per lanciare la generazione dei Business Objects:

1. Aprire una shell nella cartella del progetto `helpgen`
2. Eseguire il comando con i seguenti parametri:
   - `[cartella di output]`: dove verranno generati i file
   - `[cartella di input]`: contenente le cartelle di sviluppo da analizzare

### Esempio

```bash
C:\helpgen> npm run help C:\helpgensource C:\MagoDevelop\Standard\Applications
```

Questo comando analizzerà la directory di sviluppo `C:\MagoDevelop\Standard\Applications`  
e genererà l'output in `C:\helpgensource`.

---

## Output

- `BusinessObjects.sam`: file di output da aprire con **SuperSam**
- Possibilità di generare HTML tramite SuperSam

