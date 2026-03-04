import { ComponentType } from "react";
import { ErrorBoundary } from "react-error-boundary";
import ErrorFallback from "./error-fallback";

type Config = {
  component: string;
};

const withErrorBoundary =
  (config: Config) =>
  <P extends object>(Component: ComponentType<P>) => {
    const EnhancedComponent = (props: P) => {
      return (
        <ErrorBoundary
          FallbackComponent={(fallbackProps) => (
            <ErrorFallback {...fallbackProps} config={config} />
          )}
        >
          <Component {...props} />
        </ErrorBoundary>
      );
    };

    return EnhancedComponent;
  };

export default withErrorBoundary;
