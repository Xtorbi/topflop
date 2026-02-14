import { Link } from 'react-router-dom';
import useSEO from '../hooks/useSEO';

function Privacy() {
  useSEO({
    title: 'Politique de confidentialite | Topflop',
    description: 'Politique de confidentialite de Topflop : donnees collectees, cookies, sous-traitants, droits RGPD.',
  });
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
          <h1 className="font-heading text-4xl text-white mb-8 tracking-wide">Politique de confidentialite</h1>

          <div className="prose prose-invert prose-sm max-w-none space-y-6 text-white/80">
            <p className="text-white/60 text-sm">Derniere mise a jour : 10 fevrier 2026</p>

            <section>
              <h2 className="text-xl font-semibold text-white mt-8 mb-4">1. Responsable de traitement</h2>
              <p>
                Le responsable du traitement des donnees collectees sur Topflop (www.topflop.fr) est :
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li><strong>Editeur</strong> : Topflop — projet personnel</li>
                <li><strong>Email</strong> : <a href="mailto:contact@topflop.fr" className="text-fv-green hover:underline">contact@topflop.fr</a></li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mt-8 mb-4">2. Donnees collectees et bases legales</h2>
              <p>Nous collectons les donnees suivantes :</p>
              <table className="w-full mt-3 text-sm">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-2 text-white">Donnee</th>
                    <th className="text-left py-2 text-white">Finalite</th>
                    <th className="text-left py-2 text-white">Base legale</th>
                  </tr>
                </thead>
                <tbody className="text-white/70">
                  <tr className="border-b border-white/10">
                    <td className="py-2">Adresse IP (hashee)</td>
                    <td className="py-2">Anti-spam, deduplication des votes</td>
                    <td className="py-2">Interet legitime (Art. 6(1)(f))</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-2">Votes (positif/neutre/negatif)</td>
                    <td className="py-2">Classement communautaire</td>
                    <td className="py-2">Interet legitime (Art. 6(1)(f))</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-2">Cookies publicitaires (Google AdSense)</td>
                    <td className="py-2">Affichage de publicites</td>
                    <td className="py-2">Consentement (Art. 6(1)(a))</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-2">Donnees de navigation (Vercel Analytics)</td>
                    <td className="py-2">Mesure d'audience</td>
                    <td className="py-2">Consentement (Art. 6(1)(a))</td>
                  </tr>
                  <tr>
                    <td className="py-2">localStorage (preferences)</td>
                    <td className="py-2">Compteur de votes, consentement cookies</td>
                    <td className="py-2">Strictement necessaire</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-3 text-sm">
                <strong>Securite</strong> : les adresses IP sont hashees via HMAC-SHA256 avant stockage en base de donnees.
                Elles ne sont jamais stockees en clair.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mt-8 mb-4">3. Cookies et traceurs</h2>
              <p>
                Les cookies publicitaires (Google AdSense) et d'analyse (Vercel Analytics) ne sont charges
                qu'apres votre consentement explicite via la banniere cookies.
                Vous pouvez modifier votre choix a tout moment via le lien "Gerer mes cookies" en bas de page.
              </p>
              <p className="mt-3">
                Votre consentement est valable 13 mois. Passe ce delai, il vous sera redemande.
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li><strong>Cookies Google AdSense</strong> : diffusion de publicites personnalisees. Vous pouvez gerer vos preferences sur <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="text-fv-green hover:underline">adssettings.google.com</a></li>
                <li><strong>Vercel Analytics</strong> : mesure d'audience (pages vues, Web Vitals)</li>
                <li><strong>localStorage</strong> : preferences locales (non transmis a nos serveurs, strictement necessaire)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mt-8 mb-4">4. Sous-traitants et destinataires</h2>
              <p>Vos donnees peuvent etre traitees par les sous-traitants suivants :</p>
              <table className="w-full mt-3 text-sm">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-2 text-white">Sous-traitant</th>
                    <th className="text-left py-2 text-white">Usage</th>
                    <th className="text-left py-2 text-white">Localisation</th>
                  </tr>
                </thead>
                <tbody className="text-white/70">
                  <tr className="border-b border-white/10">
                    <td className="py-2">Vercel Inc.</td>
                    <td className="py-2">Hebergement frontend, analytics</td>
                    <td className="py-2">USA (EU-US DPF)</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-2">Render Inc.</td>
                    <td className="py-2">Hebergement backend API</td>
                    <td className="py-2">Allemagne (Frankfurt)</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-2">Turso (ChiselStrike Inc.)</td>
                    <td className="py-2">Base de donnees</td>
                    <td className="py-2">Irlande (EU West)</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-2">Google LLC</td>
                    <td className="py-2">AdSense (publicites)</td>
                    <td className="py-2">USA (EU-US DPF)</td>
                  </tr>
                  <tr className="border-b border-white/10">
                    <td className="py-2">Google Fonts</td>
                    <td className="py-2">Polices de caracteres (Inter, Bebas Neue)</td>
                    <td className="py-2">USA (CDN, pas de cookies)</td>
                  </tr>
                  <tr>
                    <td className="py-2">flagcdn.com</td>
                    <td className="py-2">Drapeaux des nationalites (images)</td>
                    <td className="py-2">CDN public (pas de cookies)</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-3 text-sm">
                Les transferts vers les USA sont encadres par le EU-US Data Privacy Framework.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mt-8 mb-4">5. Conservation des donnees</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Votes et IPs hashees</strong> : conserves pendant la duree de la saison de football en cours. Les IPs hashees sont anonymisees (mises a NULL) en fin de saison.</li>
                <li><strong>Consentement cookies</strong> : 13 mois maximum (renouvellement automatique).</li>
                <li><strong>localStorage</strong> : persiste sur votre appareil jusqu'a ce que vous le supprimiez.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mt-8 mb-4">6. Vos droits (RGPD)</h2>
              <p>
                Conformement au Reglement General sur la Protection des Donnees (RGPD), vous disposez des droits suivants :
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-3">
                <li>Droit d'acces a vos donnees</li>
                <li>Droit de rectification</li>
                <li>Droit a l'effacement</li>
                <li>Droit a la portabilite</li>
                <li>Droit d'opposition au traitement</li>
                <li>Droit de retirer votre consentement a tout moment</li>
              </ul>
              <p className="mt-3">
                Pour exercer ces droits, contactez-nous a <a href="mailto:contact@topflop.fr" className="text-fv-green hover:underline">contact@topflop.fr</a>.
              </p>
              <p className="mt-3">
                Vous disposez egalement du droit d'introduire une reclamation aupres de la CNIL
                (Commission Nationale de l'Informatique et des Libertes) : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-fv-green hover:underline">www.cnil.fr</a>.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mt-8 mb-4">7. Hebergeurs</h2>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Frontend</strong> : Vercel Inc., 440 N Baxter St, Los Angeles, CA 90012, USA</li>
                <li><strong>Backend</strong> : Render Inc., 525 Brannan St, San Francisco, CA 94107, USA (serveurs Frankfurt, Allemagne)</li>
                <li><strong>Base de donnees</strong> : ChiselStrike Inc. (Turso), serveurs AWS eu-west-1 (Irlande)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white mt-8 mb-4">8. Contact</h2>
              <p>
                Pour toute question concernant cette politique de confidentialite, contactez-nous via
                notre <Link to="/contact" className="text-fv-green hover:underline">page de contact</Link> ou
                par email a <a href="mailto:contact@topflop.fr" className="text-fv-green hover:underline">contact@topflop.fr</a>.
              </p>
            </section>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Privacy;
