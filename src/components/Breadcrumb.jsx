import { ChevronIcon } from '@/components/icons';

const PAGE_NAMES = {
  dashboard: 'Cloud Dashboard',
  costos: 'Costos',
  seguridad: 'Seguridad',
  informes: 'Informes',
  cuentas: 'Cuentas',
  notificaciones: 'Notificaciones',
  configuracion: 'Configuración',
};

export function Breadcrumb({ page }) {
  const buildChain = () => {
    const chain = [{ id: 'dashboard', label: 'Cloud Dashboard' }];
    if (page !== 'dashboard') {
      chain.push({ id: page, label: PAGE_NAMES[page] || page });
    }
    return chain;
  };

  const chain = buildChain();

  return (
    <nav className="flex items-center gap-1.5 text-xs">
      {chain.map((item, i) => (
        <span key={item.id} className="flex items-center gap-1.5">
          {i > 0 && <ChevronIcon size={10} className="text-text-muted" />}
          <span className={i === chain.length - 1 ? 'text-text-primary font-medium' : 'text-text-muted hover:text-text-secondary transition-colors'}>
            {item.label}
          </span>
        </span>
      ))}
    </nav>
  );
}
