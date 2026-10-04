import {
  CheckCircle2,
} from "lucide-react";


interface RiskFactorsProps {
  factors: string[];
}


export function RiskFactors({
  factors,
}: RiskFactorsProps) {
  return (
    <div className="risk-factors">
      <span className="eyebrow">
        WHY THIS SCORE
      </span>

      <ul>
        {factors.map(
          (
            factor,
            index,
          ) => (
            <li
              key={`${index}-${factor}`}
            >
              <CheckCircle2
                size={16}
              />

              <span>
                {factor}
              </span>
            </li>
          ),
        )}
      </ul>
    </div>
  );
}