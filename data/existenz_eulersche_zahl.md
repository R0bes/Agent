# Kurzpapier: Existenz einer Basis (a) mit (displaystylerac{d}{dx}a^{x}=a^{x})

## Einleitung
Die Exponentialfunktion (f_{a}(x)=a^{x}) ist für jede reelle Basis (a>0) definiert. In der Analysis wird häufig die Ableitung von (f_{a}) untersucht. Im Folgenden zeigen wir, dass es genau eine Basis (ainmathbb{R}_{>0}), nämlich die Eulersche Zahl (e), für welche die Ableitung exakt gleich der Funktion selbst ist.

## Theoretischer Hintergrund
Für (a>0) gilt
[
rac{d}{dx}a^{x}=a^{x}ln a .]
Dies folgt aus der Kettenregel, indem man (a^{x}=exp(xln a)) schreibt und die Ableitung von (exp(u)=e^{u}) nutzt.

## Bedingung für Gleichheit
Wir suchen nun ein (a), sodass
[
a^{x}ln a = a^{x}quadorall xinmathbb{R} .]
Da (a^{x}>0) ist, kann man durch Division von beiden Seiten mit (a^{x}) die Gleichung zu (ln a=1) vereinfachen. Die einzige reelle Lösung davon ist
[
 a = e .]
Damit gilt für alle reellen (x):
[
rac{d}{dx}e^{x}=e^{x}.] 

## Beweis der Einzigartigkeit
Die Gleichung (ln a=1) hat eindeutig die Lösung (a=e), da der Logarithmus eine streng monoton wachsende Funktion ist. Somit existiert genau ein (a>0), für das die Ableitung von (a^{x}) gleich (a^{x}) ist.

## Schlussfolgerung
Wir haben gezeigt, dass die Eulersche Zahl (e) die einzige Basis einer Exponentialfunktion ist, deren Ableitung exakt der Funktion selbst entspricht. Diese Eigenschaft macht (e) zu einem fundamentalen Element in Analysis und verwandten Gebieten.

---

**Referenzen**
1. Rudin, W. *Principles of Mathematical Analysis*. McGraw‑Hill, 1976.
2. Spivak, M. *Calculus*, 4th ed., Publish or Perish, 2008.