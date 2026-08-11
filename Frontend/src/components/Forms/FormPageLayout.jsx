import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Full-page form shell (replaces FloatingCard for forms).
 */
const FormPageLayout = ({
  title,
  subtitle,
  backTo,
  onBack,
  children,
  maxWidth = "max-w-7xl",
  embedded = false,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) onBack();
    else if (backTo) navigate(backTo);
    else navigate(-1);
  };

  return (
    <div className="w-full text-ink py-1 px-1 sm:px-2">
      <div className={`mx-auto ${maxWidth} w-full`}>
        <div className="mb-4">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-xl font-bold text-ink tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-ink-muted mt-0.5">{subtitle}</p>}
        </div>

        {embedded ? children : <div className="tracker-card-plain !border-l-0 p-4 sm:p-5">{children}</div>}
      </div>
    </div>
  );
};

export default FormPageLayout;
