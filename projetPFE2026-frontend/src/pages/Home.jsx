import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggleButton from "../components/ThemeToggleButton.jsx";

export default function Home() {
  const navigate = useNavigate();
  const [introDone, setIntroDone] = useState(false);

  const [stats, setStats] = useState({
    colis: 0,
    partenaires: 0,
    satisfaction: 0,
    villes: 0,
  });

  useEffect(() => {
    let start = 0;
    const interval = setInterval(() => {
      start += 10;

      setStats({
        colis: start * 5,
        partenaires: Math.min(start / 2, 35),
        satisfaction: Math.min(start, 98),
        villes: Math.min(start / 30, 3),
      });

      if (start >= 100) clearInterval(interval);
    }, 40);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setIntroDone(true), 2600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      document.querySelectorAll(".fadeUp").forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight - 120) el.classList.add("show");
      });
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ✅ afficher uniquement la section ciblée (les autres sont masquées)
  const focusSection = (selector) => {
    const all = document.querySelectorAll(".homeSection");
    all.forEach((s) => {
      s.classList.add("hide");
      s.classList.remove("focused");
    });

    const target = document.querySelector(selector);
    if (target) {
      target.classList.remove("hide");
      target.classList.add("focused");
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  // ✅ tout réafficher
  const resetFocus = () => {
    document.querySelectorAll(".homeSection").forEach((s) => {
      s.classList.remove("hide");
      s.classList.remove("focused");
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="page">
      {/* Navbar */}
      <header className="nav">
        <div className="navBrand" onClick={resetFocus}>
          <span className="navDot" />
          <span>MZ Logistic</span>
        </div>

        <nav className="navLinks">
          <button className="linkBtn" type="button" onClick={() => focusSection("#services")}>
            Services
          </button>
          <button className="linkBtn" type="button" onClick={() => focusSection("#tech")}>
            Technologie
          </button>
          <button className="linkBtn" type="button" onClick={() => focusSection("#zones")}>
            Zones
          </button>
          <button className="linkBtn" type="button" onClick={() => focusSection("#about")}>
            À propos
          </button>
          <button className="linkBtn" type="button" onClick={() => focusSection("#contact")}>
            Contact
          </button>
          <button className="linkBtn ghost" type="button" onClick={resetFocus}>
            Tout afficher
          </button>
        </nav>

        <div className="navActions">
          <ThemeToggleButton compact />
        </div>
      </header>

      {/* HERO */}
      <section className="heroWrap">
        <div className={`introLayer ${introDone ? "introDone" : ""}`}>
          <div className="introSky" />
          <div className="introRoad">
            <div className="introRoadLine" />
          </div>
          <div className="introTruck">🚚</div>
          <div className="introText">
            <div className="introTitle">MZ Logistic</div>
            <div className="introSub">Transport • Suivi • Fiabilité</div>
          </div>
        </div>

        <div className={`heroContent ${introDone ? "show" : ""}`}>
          <div className="heroCenter">
            <div className="logoBlock">
              <div className="logoBadge">MZ</div>
              <div>
                <div className="logoTitle">MZ Logistic</div>
                <div className="logoTag">Solutions de livraison & gestion expéditions</div>
              </div>
            </div>

            <div className="heroHeadline">
              Optimisez vos livraisons grâce à une gestion intelligente et un suivi en temps réel.
            </div>

            <div className="heroButtons">
              <button className="btnPrimary big" onClick={() => navigate("/expediteur/register")}>
                Espace Expéditeur
              </button>
              <button className="btnGhost big" onClick={() => navigate("/admin/login")}>
                Espace Admin
              </button>
            </div>
          </div>

          <div className="heroGrid">
            <div className="card">
              <div className="cardTitle">📦 Suivi clair</div>
              <div className="cardText">Statut et historique des colis en temps réel.</div>
            </div>
            <div className="card">
              <div className="cardTitle">🗺️ Optimisation IA</div>
              <div className="cardText">Génération automatique des tournées optimisées.</div>
            </div>
            <div className="card">
              <div className="cardTitle">📱 Application livreur</div>
              <div className="cardText">Mise à jour rapide des livraisons.</div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN */}
      <main className="main">
        {/* STATS (mis داخل main باش gap يخدم) */}
        <section className="section fadeUp homeSection" id="stats">
          <div className="statsGrid">
            <div className="statBox">
              <h2>+{Math.floor(stats.colis)}</h2>
              <p>Colis livrés</p>
            </div>

            <div className="statBox">
              <h2>+{Math.floor(stats.partenaires)}</h2>
              <p>Partenaires</p>
            </div>

            <div className="statBox">
              <h2>{Math.floor(stats.satisfaction)}%</h2>
              <p>Satisfaction client</p>
            </div>

            <div className="statBox">
              <h2>{Math.floor(stats.villes)}</h2>
              <p>Villes couvertes</p>
            </div>
          </div>
        </section>

        {/* SERVICES */}
        <section id="services" className="section fadeUp homeSection">
          <h2>Nos Services</h2>
          <div className="list">
            <div className="listItem">🚚 Livraison e-commerce (B2C)</div>
            <div className="listItem">📦 Collecte & expédition</div>
            <div className="listItem">📍 Suivi des colis</div>
            <div className="listItem">🛡️ Transport sécurisé produits fragiles</div>
          </div>
        </section>

        {/* TECHNOLOGIE */}
        <section id="tech" className="section fadeUp homeSection">
          <h2>Technologie & Innovation</h2>
          <p>
            Notre plateforme centralisée automatise la planification des tournées grâce à l’intelligence
            artificielle, réduisant les distances et les coûts logistiques.
          </p>
          <div className="list">
            <div className="listItem">🗺️ Visualisation cartographique</div>
            <div className="listItem">📊 Dashboard administrateur</div>
            <div className="listItem">📱 Application mobile livreur</div>
          </div>
        </section>

        {/* ZONES */}
        <section id="zones" className="section fadeUp homeSection">
          <h2>Zones couvertes</h2>
          <div className="list">
            <div className="listItem">📍 Kairouan</div>
            <div className="listItem">📍 Sousse</div>
            <div className="listItem">🇹🇳 Livraison nationale via partenaires</div>
          </div>
        </section>

        {/* ABOUT */}
        <section id="about" className="section fadeUp homeSection">
          <h2>À propos</h2>
          <p>
            MZ Logistic est une entreprise tunisienne spécialisée dans la logistique et la livraison pour
            les boutiques e-commerce. Notre objectif : rapidité, fiabilité et satisfaction client.
          </p>
        </section>

        {/* CTA */}
        <section className="section fadeUp homeSection">
          <div className="ctaBox">
            <h2>Prêt à optimiser vos livraisons ?</h2>
            <p>Rejoignez MZ Logistic et simplifiez la gestion de vos expéditions.</p>
            <button className="btnPrimary" onClick={() => navigate("/expediteur/register")}>
              Créer un compte expéditeur
            </button>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="section fadeUp homeSection">
          <h2>Contact</h2>
          <div className="contactGrid">
            <div className="contactCard">
              <div className="cardTitle">📞 Téléphone</div>
              <div className="cardText">+216 XX XXX XXX</div>
            </div>
            <div className="contactCard">
              <div className="cardTitle">✉️ Email</div>
              <div className="cardText">contact@mzlogistic.tn</div>
            </div>
            <div className="contactCard">
              <div className="cardTitle">📍 Adresse</div>
              <div className="cardText">Kairouan, Tunisie</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">© {new Date().getFullYear()} MZ Logistic — Tous droits réservés.</footer>
    </div>
  );
}

