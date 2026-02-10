import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <section className="min-h-screen bg-vibes pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-md text-center">
        <p className="text-6xl font-heading font-extrabold text-white mb-4">404</p>
        <p className="text-white/80 text-lg mb-2">Page introuvable</p>
        <p className="text-white/50 text-sm mb-8">Cette page n'existe pas ou a ete deplacee.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="px-6 py-3 rounded-full bg-fv-green text-fv-navy font-bold hover:bg-fv-green-dark transition-colors"
          >
            Accueil
          </Link>
          <Link
            to="/vote"
            className="px-6 py-3 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/40 font-bold transition-colors"
          >
            Voter
          </Link>
        </div>
      </div>
    </section>
  );
}

export default NotFound;
