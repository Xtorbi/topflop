import { Link } from 'react-router-dom';

function Contact() {
  const email = 'contact@topflop.fr';

  const subjects = [
    { label: 'Question generale', value: 'Question generale sur Topflop' },
    { label: 'Signaler un bug', value: 'Signalement de bug sur Topflop' },
    { label: 'Suggestion', value: 'Suggestion pour Topflop' },
    { label: 'Demande RGPD', value: 'Demande RGPD - Exercice de droits' },
    { label: 'Autre', value: 'Contact Topflop' },
  ];

  return (
    <section className="min-h-screen bg-vibes pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour
        </Link>

        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
          <h1 className="font-heading text-4xl text-white mb-8 tracking-wide">Contact</h1>

          <div className="space-y-8">
            <p className="text-white/80">
              Une question, une suggestion ou un probleme a signaler ?
              Contactez-nous par email a l'adresse ci-dessous.
            </p>

            <div className="bg-white/5 rounded-xl p-6 border border-white/10 text-center">
              <p className="text-white/60 text-sm mb-3">Adresse de contact</p>
              <a
                href={`mailto:${email}`}
                className="text-fv-green text-xl font-bold hover:underline"
              >
                {email}
              </a>
            </div>

            <div>
              <p className="text-white/60 text-sm mb-4">Raccourcis par sujet :</p>
              <div className="flex flex-wrap gap-2">
                {subjects.map((s) => (
                  <a
                    key={s.label}
                    href={`mailto:${email}?subject=${encodeURIComponent(s.value)}`}
                    className="px-4 py-2 rounded-full bg-white/10 text-white/80 text-sm hover:bg-white/15 hover:text-white transition-colors"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-white/10">
              <p className="text-white/60 text-sm">
                Pour les demandes RGPD (acces, effacement, portabilite de vos donnees),
                merci de preciser votre adresse IP approximative ou la date de vos votes
                afin que nous puissions identifier vos donnees.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Contact;
