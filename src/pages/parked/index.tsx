import withErrorBoundary from "@/components/hoc/with-error-boundary";
import ParkedSales from "@/components/parked-sales";

const ParkedPage = () => {
  return <ParkedSales />;
};

const ParkedPageWithErrorBoundary = withErrorBoundary({
  component: "ParkedPage",
})(ParkedPage);

export default ParkedPageWithErrorBoundary;
