import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Basket',
  description: 'Politique de confidentialité et traitement des données personnelles de Basket, conformément au RGPD et aux recommandations de la CNIL.',
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="text-xl font-bold text-graphite mb-4">{title}</h2>
    <div className="space-y-3 text-graphite/70 text-sm leading-relaxed">{children}</div>
  </section>
)

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-paper text-graphite">
      {/* Nav */}
      <header className="border-b sticky top-0 bg-paper/90 backdrop-blur z-10" style={{ borderColor: 'rgba(17,17,17,0.08)' }}>
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <img src="/basket_logo.png" alt="Basket" className="h-7 w-7" />
            <span className="font-bold text-graphite">Basket</span>
          </Link>
          <span className="text-graphite/20">/</span>
          <span className="text-sm text-graphite/50">Politique de confidentialité</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12">
        <h1 className="text-3xl font-extrabold text-graphite mb-2">Politique de confidentialité</h1>
        <p className="text-sm text-graphite/40 mb-10">Dernière mise à jour : 8 avril 2026</p>

        <Section title="1. Responsable du traitement">
          <p>
            Le responsable du traitement des données personnelles collectées via l&apos;application Basket est :
          </p>
          <div className="glass rounded-xl p-4 font-mono text-xs space-y-1">
            <p><strong>Basket SAS</strong></p>
            <p>Siège social : France</p>
            <p>Contact DPO : <a href="mailto:teams@basketbeta.com" className="underline" style={{ color: '#7ed957' }}>teams@basketbeta.com</a></p>
          </div>
        </Section>

        <Section title="2. Données collectées">
          <p>Nous collectons uniquement les données nécessaires au fonctionnement du service :</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li><strong>Données de compte :</strong> adresse e-mail, mot de passe (chiffré), code postal.</li>
            <li><strong>Tickets de caisse :</strong> images uploadées pour l&apos;analyse OCR par intelligence artificielle. Les images ne sont pas conservées au-delà du traitement.</li>
            <li><strong>Articles et prix :</strong> noms des produits, prix, nom du magasin, date d&apos;achat.</li>
            <li><strong>Données de localisation :</strong> code postal ou coordonnées GPS approximatives (avec votre consentement explicite), pour afficher les prix de votre secteur.</li>
            <li><strong>Données d&apos;utilisation :</strong> pages visitées, actions effectuées, pour améliorer l&apos;application.</li>
          </ul>
        </Section>

        <Section title="3. Finalités du traitement">
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>Fournir le service de comparaison de prix (base légale : exécution du contrat).</li>
            <li>Améliorer la précision de l&apos;analyse OCR (base légale : intérêt légitime).</li>
            <li>Envoyer des alertes de baisse de prix, avec votre consentement (base légale : consentement).</li>
            <li>Constituer une base de données de prix communautaire entièrement anonymisée (base légale : intérêt légitime).</li>
            <li>Envoyer la newsletter, si vous y êtes inscrit (base légale : consentement).</li>
          </ul>
        </Section>

        <Section title="4. Anonymisation des données communautaires">
          <p>
            Lorsque vos données de prix contribuent à la base communautaire, elles sont <strong>intégralement anonymisées</strong> avant tout traitement partagé :
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>Suppression de tous les éléments d&apos;identification personnelle (nom, téléphone, email, numéro de carte de fidélité, IBAN, numéro de transaction).</li>
            <li>Le code postal est réduit au niveau du département (ex. 75013 → 75).</li>
            <li>Aucun identifiant utilisateur n&apos;est attaché aux données communautaires publiées.</li>
          </ul>
        </Section>

        <Section title="5. Partage des données">
          <p>Nous ne vendons jamais vos données. Elles peuvent être partagées avec :</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li><strong>Supabase (PostgreSQL) :</strong> hébergement de la base de données — serveurs en Europe (EU-West).</li>
            <li><strong>Anthropic Claude API :</strong> analyse OCR des tickets de caisse. Les images sont transmises uniquement pour le traitement et ne sont pas stockées par Anthropic au-delà de la requête.</li>
            <li><strong>Upstash Redis :</strong> limitation de requêtes, sans données personnelles.</li>
            <li><strong>Nominatim / OpenStreetMap :</strong> géocodage inversé anonymisé.</li>
          </ul>
        </Section>

        <Section title="6. Durée de conservation">
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>Compte et données associées : conservés jusqu&apos;à la suppression du compte.</li>
            <li>Images de tickets : supprimées immédiatement après traitement OCR.</li>
            <li>Données de prix : conservées jusqu&apos;à la suppression du compte, puis anonymisées dans la base communautaire.</li>
            <li>Logs de connexion : 90 jours maximum.</li>
            <li>Newsletter : jusqu&apos;au désabonnement.</li>
          </ul>
        </Section>

        <Section title="7. Vos droits (RGPD)">
          <p>Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li><strong>Droit d&apos;accès :</strong> obtenir une copie de vos données.</li>
            <li><strong>Droit de rectification :</strong> corriger des données inexactes.</li>
            <li><strong>Droit à l&apos;effacement :</strong> supprimer votre compte et toutes vos données personnelles (disponible directement depuis votre profil).</li>
            <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré.</li>
            <li><strong>Droit d&apos;opposition :</strong> vous opposer au traitement pour motif légitime.</li>
            <li><strong>Droit de retrait du consentement :</strong> à tout moment, pour les traitements basés sur le consentement.</li>
          </ul>
          <p>
            Pour exercer ces droits, contactez-nous à <a href="mailto:teams@basketbeta.com" className="underline" style={{ color: '#7ed957' }}>teams@basketbeta.com</a>.
            Vous disposez également du droit de déposer une réclamation auprès de la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: '#7ed957' }}>CNIL</a>.
          </p>
        </Section>

        <Section title="8. Cookies et traceurs">
          <p>
            Basket utilise uniquement des cookies techniques strictement nécessaires au fonctionnement du service (session d&apos;authentification Supabase). Aucun cookie publicitaire ou de traçage tiers n&apos;est déposé.
          </p>
          <p>Ces cookies ne nécessitent pas de consentement préalable selon les recommandations de la CNIL (article 82 de la loi Informatique et Libertés).</p>
        </Section>

        <Section title="9. Sécurité">
          <p>
            Vos données sont protégées par chiffrement TLS en transit et au repos. L&apos;accès à la base de données est restreint par Row Level Security (RLS). Les mots de passe sont hashés via bcrypt et ne sont jamais accessibles en clair.
          </p>
        </Section>

        <Section title="10. Modifications">
          <p>
            Nous pouvons modifier cette politique à tout moment. Toute modification substantielle vous sera notifiée par e-mail ou via l&apos;application. La date de dernière mise à jour est indiquée en haut de cette page.
          </p>
        </Section>

        <div className="border-t pt-8 flex flex-wrap gap-4 text-sm text-graphite/40" style={{ borderColor: 'rgba(17,17,17,0.08)' }}>
          <Link href="/" className="hover:text-graphite transition-colors">Accueil</Link>
          <Link href="/terms" className="hover:text-graphite transition-colors">Conditions d&apos;utilisation</Link>
          <Link href="/contact" className="hover:text-graphite transition-colors">Contact</Link>
          <a href="mailto:teams@basketbeta.com" className="hover:text-graphite transition-colors">teams@basketbeta.com</a>
        </div>
      </main>
    </div>
  )
}
