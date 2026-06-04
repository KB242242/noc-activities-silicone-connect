type AppEmailConversationBackgroundProps = {
  customBackgroundImage?: string | null;
};

export function AppEmailConversationBackground({ customBackgroundImage }: AppEmailConversationBackgroundProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
      {customBackgroundImage ? (
        customBackgroundImage.startsWith('data:') ? (
          <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30" style={{ backgroundImage: `url(${customBackgroundImage})` }} />
        ) : customBackgroundImage === 'pattern-dots' ? (
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle, #00BCD4 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.15 }} />
        ) : customBackgroundImage === 'pattern-lines' ? (
          <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #00BCD4 0, #00BCD4 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px', opacity: 0.1 }} />
        ) : customBackgroundImage === 'pattern-grid' ? (
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#00BCD4 1px, transparent 1px), linear-gradient(90deg, #00BCD4 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.1 }} />
        ) : customBackgroundImage === 'pattern-circuit' ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <img src="/logo_noc_activities_sans_fond.png" alt="" className="w-96 h-96 object-contain opacity-[0.25] dark:opacity-[0.15]" />
          </div>
        ) : null
      ) : (
        <>
          <div className="absolute inset-0 flex items-center justify-center">
            <img src="/logo_noc_activities_sans_fond.png" alt="" className="w-96 h-96 object-contain opacity-[0.20] dark:opacity-[0.12]" />
          </div>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300BCD4' fill-opacity='0.07'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
              backgroundSize: '60px 60px',
            }}
          ></div>
          <img src="/logo_noc_activities_sans_fond.png" alt="" className="absolute top-4 left-4 w-20 h-20 object-contain opacity-[0.12] dark:opacity-[0.08]" />
          <img src="/logo_noc_activities_sans_fond.png" alt="" className="absolute bottom-4 right-4 w-20 h-20 object-contain opacity-[0.12] dark:opacity-[0.08]" />
          <img src="/logo_noc_activities_sans_fond.png" alt="" className="absolute top-4 right-4 w-12 h-12 object-contain opacity-[0.08] dark:opacity-[0.05]" />
          <img src="/logo_noc_activities_sans_fond.png" alt="" className="absolute bottom-4 left-4 w-12 h-12 object-contain opacity-[0.08] dark:opacity-[0.05]" />
        </>
      )}
    </div>
  );
}