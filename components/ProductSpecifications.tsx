import type { DemoSpecifications, Product } from "@/types/product";

type DetailValue = string | number | boolean | readonly string[] | undefined;

type DetailItem = {
  label: string;
  value: DetailValue;
  unit?: string;
};

type ScoreItem = {
  label: string;
  value: number | undefined;
};

function hasValue(value: DetailValue) {
  return (
    value !== undefined &&
    value !== "" &&
    (!Array.isArray(value) || value.length > 0)
  );
}

function formatValue(value: Exclude<DetailValue, undefined>, unit?: string) {
  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return `${value}${unit ? ` ${unit}` : ""}`;
}

function DetailGroup({
  title,
  items,
}: {
  title: string;
  items: readonly DetailItem[];
}) {
  const visibleItems = items.filter((item) => hasValue(item.value));

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <section className="border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
        {title}
      </h3>
      <dl className="mt-4 divide-y divide-gray-100">
        {visibleItems.map((item) => (
          <div
            key={item.label}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-4 py-2.5 text-xs"
          >
            <dt className="text-gray-500">{item.label}</dt>
            <dd className="text-right font-medium text-gray-800">
              {formatValue(
                item.value as Exclude<DetailValue, undefined>,
                item.unit,
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function ScoreGroup({ scores }: { scores: readonly ScoreItem[] }) {
  const visibleScores = scores.filter(
    (score): score is { label: string; value: number } =>
      score.value !== undefined,
  );

  if (visibleScores.length === 0) {
    return null;
  }

  return (
    <section className="border border-gray-200 bg-white p-5 lg:col-span-2">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
        Performance scores
      </h3>
      <div className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleScores.map((score) => (
          <div key={score.label}>
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="text-gray-600">{score.label}</span>
              <span className="font-semibold text-gray-900">
                {score.value}/10
              </span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-full bg-gray-200"
              role="progressbar"
              aria-label={score.label}
              aria-valuemin={1}
              aria-valuemax={10}
              aria-valuenow={score.value}
            >
              <div
                className="h-full rounded-full bg-amber-500"
                style={{ width: `${score.value * 10}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function IntendedUse({
  specifications,
}: {
  specifications: DemoSpecifications;
}) {
  const groups = [
    { label: "Ideal for", values: specifications.idealFor },
    { label: "Terrain", values: specifications.terrain },
    { label: "Season", values: specifications.season },
    { label: "Occasion", values: specifications.occasion },
  ].filter(
    (group): group is { label: string; values: readonly string[] } =>
      Boolean(group.values?.length),
  );

  if (groups.length === 0) {
    return null;
  }

  return (
    <section className="border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
        Intended use
      </h3>
      <div className="mt-4 space-y-4">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-xs text-gray-500">{group.label}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.values.map((value) => (
                <span
                  key={value}
                  className="border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] text-gray-700"
                >
                  {value}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features({ features }: { features?: readonly string[] }) {
  if (!features?.length) {
    return null;
  }

  return (
    <section className="border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-900">
        Features
      </h3>
      <ul className="mt-4 grid gap-2 text-xs text-gray-700 sm:grid-cols-2">
        {features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <span className="text-amber-500" aria-hidden="true">
              •
            </span>
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ProductSpecifications({
  product,
}: {
  product: Product;
}) {
  const specifications = product.demoSpecifications;
  const construction: DetailItem[] = [
    { label: "Category", value: product.category },
    { label: "Catalogue material", value: product.material },
    { label: "Upper material", value: specifications.upperMaterial },
    { label: "Lining material", value: specifications.liningMaterial },
    { label: "Body material", value: specifications.bodyMaterial },
    { label: "Sole material", value: specifications.soleMaterial },
    { label: "Outsole", value: specifications.outsoleType },
    { label: "Insole", value: specifications.insoleType },
    { label: "Closure", value: specifications.closure },
    { label: "Toe shape", value: specifications.toeShape },
    { label: "Ankle height", value: specifications.ankleHeight },
    { label: "Heel height", value: specifications.heelHeight },
    { label: "Capacity", value: specifications.capacityLiters, unit: "L" },
    {
      label: "Capacity",
      value: specifications.capacityMilliliters,
      unit: "ml",
    },
    { label: "Compartments", value: specifications.compartments },
    { label: "Card slots", value: specifications.cardSlots },
    { label: "Bill compartments", value: specifications.billCompartments },
    { label: "Coin pocket", value: specifications.coinPocket },
    { label: "Buckle", value: specifications.buckleType },
    {
      label: "Belt width",
      value: specifications.widthMillimeters,
      unit: "mm",
    },
    { label: "Insulation", value: specifications.insulation },
    { label: "Lid", value: specifications.lidType },
    { label: "Sock height", value: specifications.sockHeight },
  ];
  const fitAndComfort: DetailItem[] = [
    { label: "Fit", value: specifications.fit },
    { label: "Width", value: specifications.width },
    { label: "Cushioning", value: specifications.cushioning },
    { label: "Arch support", value: specifications.archSupport },
    { label: "Flexibility", value: specifications.flexibility },
    { label: "Breathability", value: specifications.breathability },
    { label: "Grip", value: specifications.grip },
    { label: "Stability", value: specifications.stability },
    { label: "Weight class", value: specifications.weightClass },
    {
      label: "Estimated weight",
      value: specifications.estimatedWeightGrams,
      unit: "g",
    },
    { label: "Water resistance", value: specifications.waterResistance },
    { label: "Durability", value: specifications.durability },
    { label: "Strap", value: specifications.strapType },
    { label: "Laptop compatibility", value: specifications.laptopCompatibility },
    { label: "Carry style", value: specifications.carryStyle },
    { label: "Adjustability", value: specifications.adjustability },
    { label: "Style", value: specifications.style },
    { label: "Leak resistance", value: specifications.leakResistance },
    { label: "Portability", value: specifications.portability },
    { label: "Stretch", value: specifications.stretch },
  ];
  const scores: ScoreItem[] = [
    { label: "Comfort", value: specifications.comfortScore },
    { label: "Breathability", value: specifications.breathabilityScore },
    { label: "Grip", value: specifications.gripScore },
    { label: "Durability", value: specifications.durabilityScore },
    { label: "Flexibility", value: specifications.flexibilityScore },
    { label: "Stability", value: specifications.stabilityScore },
    { label: "Organization", value: specifications.organizationScore },
    { label: "Portability", value: specifications.portabilityScore },
  ];

  return (
    <section
      className="mt-16 border-t border-gray-200 pt-10"
      aria-labelledby="product-specifications-heading"
    >
      <div>
        <h2
          id="product-specifications-heading"
          className="text-2xl font-semibold"
        >
          Product details &amp; specifications
        </h2>
        {specifications.source === "synthetic_demo" && (
          <p className="mt-2 text-xs text-gray-500">
            Additional specifications are synthetic demo data for this
            proof-of-concept.
          </p>
        )}
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <DetailGroup title="Construction & materials" items={construction} />
        <DetailGroup title="Fit & comfort" items={fitAndComfort} />
        <ScoreGroup scores={scores} />
        <IntendedUse specifications={specifications} />
        <Features features={specifications.features} />
      </div>
    </section>
  );
}
