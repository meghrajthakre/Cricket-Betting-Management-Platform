  import { MessageSquare, AlignJustify } from "lucide-react";

  const INFO_CARDS = [
    { icon: MessageSquare, label: "User ID",  value: "Superadmin" },
    { icon: AlignJustify,  label: "Level",    value: "Super Admin" },
    { icon: MessageSquare, label: "Contact",  value: "contact@admin.com" },
  ];

  export default function Dashboard() {
    return (
      <div className="animate-fade-up">
        <h1
          className="text-2xl font-bold mb-6"
          style={{ fontFamily: "var(--font-app)", color: "var(--color-text-dark)" }}
        >
          Dashboard
        </h1>

        {/* Info cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {INFO_CARDS.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="rounded-xl p-5 shadow-sm border transition-shadow hover:shadow-md"
              style={{
                backgroundColor: "var(--color-input-bg)",
                borderColor: "var(--color-border)",
              }}
            >
              <Icon
                size={20}
                className="mb-2 opacity-50"
                style={{ color: "var(--color-primary)" }}
              />
              <p
                className="text-xs font-semibold mb-1 tracking-wide uppercase"
                style={{ color: "var(--color-accent)", fontFamily: "var(--font-app)" }}
              >
                {label}
              </p>
              <p
                className="text-lg font-bold"
                style={{ color: "var(--color-text-dark)", fontFamily: "var(--font-app)" }}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }
