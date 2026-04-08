import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: "Conditions d'utilisation — Basket",
  description: "Conditions générales d'utilisation du service Basket de comparaison de prix alimentaires.",
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="text-xl font-bold text-graphite mb-4">{title}</h2>
    <div className="space-y-3 text-graphite/70 text-sm leading-relaxed">{children}</div>
  </section>
)

export default function TermsPage() {
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
          <span className="text-sm text-graphite/50">{"Conditions d'utilisation"}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-12">
        <h1 className="text-3xl font-extrabold text-graphite mb-2">{"Conditions générales d'utilisation"}</h1>
        <p className="text-sm text-graphite/40 mb-10">Dernière mise à jour : 8 avril 2026</p>

        <Section title="1. Objet et acceptation">
          <p>
            Les présentes Conditions Générales d&apos;Utilisation (CGU) régissent l&apos;accès et l&apos;utilisation du service Basket, accessible via l&apos;application web et mobile <strong>basketbeta.com</strong>, édité par Basket SAS.
          </p>
          <p>
            En créant un compte ou en utilisant le service, vous acceptez sans réserve les présentes CGU. Si vous n&apos;acceptez pas ces conditions, vous devez cesser d&apos;utiliser le service.
          </p>
        </Section>

        <Section title="2. Description du service">
          <p>Basket est un service de comparaison de prix alimentaires qui permet aux utilisateurs de :</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>Scanner des tickets de caisse via l&apos;appareil photo ou par import d&apos;image.</li>
            <li>Analyser les prix payés et les comparer aux prix pratiqués dans d&apos;autres enseignes.</li>
            <li>Consulter une carte des prix dans leur secteur géographique.</li>
            <li>Gérer une liste de courses optimisée selon les prix communautaires.</li>
            <li>Suivre leurs dépenses et économies au fil du temps.</li>
          </ul>
          <p>
            Les comparaisons de prix sont indicatives et basées sur des données communautaires et publiques. Basket ne garantit pas l&apos;exactitude, l&apos;exhaustivité ou la disponibilité des prix affichés.
          </p>
        </Section>

        <Section title="3. Inscription et compte utilisateur">
          <p>L&apos;accès au service nécessite la création d&apos;un compte. Vous vous engagez à :</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>Fournir des informations exactes et à jour lors de l&apos;inscription.</li>
            <li>Maintenir la confidentialité de vos identifiants de connexion.</li>
            <li>Notifier Basket immédiatement en cas d&apos;utilisation non autorisée de votre compte.</li>
            <li>Ne pas créer plusieurs comptes ou usurper l&apos;identité d&apos;un tiers.</li>
          </ul>
          <p>
            Basket se réserve le droit de suspendre ou supprimer un compte en cas de violation des présentes CGU, sans préavis.
          </p>
        </Section>

        <Section title="4. Utilisation du service et comportements interdits">
          <p>Il est interdit de :</p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>Utiliser le service à des fins commerciales sans accord préalable écrit de Basket.</li>
            <li>Extraire, scraper ou reproduire les données de prix à grande échelle.</li>
            <li>Uploader des images ne correspondant pas à de véritables tickets de caisse.</li>
            <li>Soumettre des données de prix intentionnellement erronées.</li>
            <li>Tenter de contourner les mesures de sécurité ou de limitation de débit.</li>
            <li>Utiliser le service de manière à nuire à son bon fonctionnement ou à d&apos;autres utilisateurs.</li>
          </ul>
        </Section>

        <Section title="5. Données utilisateur et contribution communautaire">
          <p>
            En utilisant Basket, vous contribuez à une base de données de prix communautaire. Les données de prix que vous soumettez sont <strong>anonymisées</strong> avant d&apos;être intégrées à cette base (voir notre <Link href="/privacy" className="underline" style={{ color: '#7ed957' }}>Politique de confidentialité</Link>).
          </p>
          <p>
            Vous accordez à Basket une licence non exclusive, mondiale et gratuite pour utiliser, reproduire et afficher vos données de prix anonymisées dans le cadre du service.
          </p>
          <p>
            Vous restez propriétaire de vos données personnelles. Vous pouvez les supprimer à tout moment depuis votre profil ou en contactant <a href="mailto:teams@basketbeta.com" className="underline" style={{ color: '#7ed957' }}>teams@basketbeta.com</a>.
          </p>
        </Section>

        <Section title="6. Propriété intellectuelle">
          <p>
            Le service Basket, son interface, son code source, ses algorithmes et sa base de données de prix sont la propriété exclusive de Basket SAS et protégés par le droit de la propriété intellectuelle.
          </p>
          <p>
            Toute reproduction, distribution ou utilisation non autorisée est strictement interdite.
          </p>
        </Section>

        <Section title="7. Limitation de responsabilité">
          <p>
            Basket est fourni <strong>en l&apos;état</strong>, sans garantie d&apos;exhaustivité, d&apos;exactitude ou de disponibilité continue. Basket SAS ne saurait être tenu responsable :
          </p>
          <ul className="list-disc list-inside space-y-1.5 pl-2">
            <li>Des erreurs dans les prix affichés ou les comparaisons.</li>
            <li>Des décisions d&apos;achat prises sur la base des informations du service.</li>
            <li>Des interruptions temporaires de service pour maintenance ou incident technique.</li>
            <li>Des pertes de données liées à des cas de force majeure.</li>
          </ul>
          <p>
            Dans tous les cas, la responsabilité de Basket SAS est limitée au montant des sommes versées par l&apos;utilisateur au cours des 12 derniers mois (service gratuit = 0 €).
          </p>
        </Section>

        <Section title="8. Disponibilité du service">
          <p>
            Basket s&apos;efforce d&apos;assurer la disponibilité du service 24h/24, 7j/7. Toutefois, des interruptions pour maintenance, mises à jour ou incidents techniques peuvent survenir. Basket ne s&apos;engage pas sur un taux de disponibilité contractuel pour la version bêta du service.
          </p>
        </Section>

        <Section title="9. Résiliation et suppression du compte">
          <p>
            Vous pouvez résilier votre compte à tout moment depuis la page <strong>Profil &gt; Supprimer mon compte</strong>. Cette action entraîne la suppression immédiate et définitive de toutes vos données personnelles, conformément à votre droit à l&apos;effacement (RGPD Art. 17).
          </p>
          <p>
            Les données anonymisées déjà intégrées à la base communautaire ne peuvent pas être retirées car elles ne sont plus rattachables à votre personne.
          </p>
        </Section>

        <Section title="10. Droit applicable et juridiction">
          <p>
            Les présentes CGU sont régies par le droit français. En cas de litige, les parties s&apos;engagent à rechercher une solution amiable avant toute procédure judiciaire. À défaut, les tribunaux compétents de Paris seront seuls compétents.
          </p>
        </Section>

        <Section title="11. Modifications des CGU">
          <p>
            Basket se réserve le droit de modifier les présentes CGU à tout moment. Les modifications prennent effet dès leur publication. Vous serez informé de toute modification substantielle par e-mail ou via une notification dans l&apos;application. L&apos;utilisation continue du service après modification vaut acceptation des nouvelles CGU.
          </p>
        </Section>

        <Section title="12. Contact">
          <p>
            Pour toute question relative aux présentes CGU : <a href="mailto:teams@basketbeta.com" className="underline" style={{ color: '#7ed957' }}>teams@basketbeta.com</a>
          </p>
        </Section>

        <div className="border-t pt-8 flex flex-wrap gap-4 text-sm text-graphite/40" style={{ borderColor: 'rgba(17,17,17,0.08)' }}>
          <Link href="/" className="hover:text-graphite transition-colors">Accueil</Link>
          <Link href="/privacy" className="hover:text-graphite transition-colors">Politique de confidentialité</Link>
          <Link href="/contact" className="hover:text-graphite transition-colors">Contact</Link>
        </div>
      </main>
    </div>
  )
}
