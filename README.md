# Replika Društvene Mreže Instagram

**Projektni zadatak iz Projektovanja informacionih sistema i baza podataka**

Ovaj projekat predstavlja mikroservisnu repliku platforme Instagram, razvijenu u skladu sa zahtevima projektnog zadatka.

---

## Članovi tima i uloge

- **[Anastasija Stevanović] (Frontend Engineer)** - Razvoj grafičkog korisničkog interfejsa.
- **[Petar Novaković] (Backend Engineer A)** - Biznis logika, autentifikacija, korisnički profili i pretraga. Implementacija Docker infrastrukture i CI/CD pipeline-a.
- **[Tijana Mijatović] (Backend Engineer B)** - Razvoj servisa za objave (Posts) i interakcije (Likes/Comments). Skladištenje medija.
- **[Jovana Marković] (Backend Engineer C)** - Servis za praćenje, blokiranje korisnika i generisanje hronološke vremenske linije.

---

## Arhitektura sistema

Aplikacija je realizovana korišćenjem **mikroservisne arhitekture**. Svaki servis je nezavisan, poseduje sopstvenu bazu podataka i izolovan je unutar Docker kontejnera.

### Servisi:

1.  **API Gateway**: Centralna tačka ulaza koja rutira zahteve ka odgovarajućim servisima.
2.  **Auth Service**: Upravlja registracijom, prijavom i izdavanjem JWT tokena.
3.  **User Service**: Upravlja podacima o profilima i pretragom korisnika.
4.  **Post Service**: Omogućava kreiranje objava, upload slika/videa i brisanje sadržaja.
5.  **Interaction Service**: Upravlja lajkovima i komentarima.
6.  **Social Service**: Upravlja relacijama praćenja i blokiranjem.
7.  **Feed Service**: Generiše hronološki prikaz objava za prijavljenog korisnika.

**Tehnologije:** Node.js (Express), mySQL, React, JWT, Multer, Docker, GitHub Actions (CI).

---

## Uputstvo za pokretanje

Da biste pokrenuli ceo sistem lokalno, potrebno je da imate instaliran **Docker** i **Docker Compose**.

1.  Klonirajte repozitorijum:
    ```bash
    git clone [https://github.com/tink8/Replika-instagrama.git]
    ```
2.  Prekopirajte `.env.example` u `.env` i podesite lokalne parametre.
3.  Pokrenite sve servise jednom komandom:
    `bash
docker-compose up --build
`
    Aplikacija će biti dostupna preko API Gateway-a na portu definisanom u `.env` fajlu.

---

## Kontinualna integracija (CI)

U skladu sa tehničkim zahtevima (2.5), podešen je **GitHub Actions** workflow koji:

- Pokreće unit testove prilikom svakog Pull Request-a na `main` granu.
- Prilikom svakog Commit-a na `main` granu automatski kreira Docker image.
- Docker image-i se taguju u formatu `yyyymmdd-hhmmss` radi preciznog verzionisnja.

---
