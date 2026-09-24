export function AuctionIllustration() {
  return (
    <div className="login-auction-art" aria-hidden="true">
      <svg viewBox="0 0 520 240" fill="none" focusable="false">
        <ellipse cx="262" cy="216" rx="228" ry="15" fill="#092A40" opacity=".5" />
        <circle cx="257" cy="120" r="105" fill="#21506B" opacity=".55" />
        <path d="M38 189H485M88 44H103M95.5 36.5V51.5M441 72H453M447 66V78" stroke="#6F9AB3" strokeWidth="2" strokeLinecap="round" />
        <circle cx="389" cy="26" r="5" fill="#E8B653" />
        <circle cx="58" cy="118" r="3" fill="#83B8D4" />
        {/* A small apartment block behind the main property. */}
        <rect x="288" y="57" width="100" height="145" rx="7" fill="#739DB4" />
        <path d="M302 57V44H377V57" fill="#A9C6D7" />
        {[0, 1, 2].map(row => [0, 1, 2].map(col => <rect key={`${row}-${col}`} x={302 + col * 26} y={72 + row * 33} width="15" height="21" rx="2" fill={row === 1 && col === 1 ? "#E8B653" : "#D8EAF3"} />))}
        <rect x="327" y="173" width="25" height="29" rx="2" fill="#305971" />
        {/* Flat architectural illustration, deliberately matching the portal palette. */}
        <path d="M114 113L209 44L305 113V202H114V113Z" fill="#F2F7FA" />
        <path d="M99 115L209 33L319 115" stroke="#E8B653" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M253 65V38H274V81" fill="#D5A146" />
        <rect x="136" y="125" width="45" height="43" rx="4" fill="#84BED8" />
        <path d="M158.5 126V167M137 146.5H180" stroke="#F2F7FA" strokeWidth="3" />
        <rect x="232" y="125" width="45" height="43" rx="4" fill="#84BED8" />
        <path d="M254.5 126V167M233 146.5H276" stroke="#F2F7FA" strokeWidth="3" />
        <rect x="192" y="138" width="29" height="64" rx="4" fill="#285975" />
        <circle cx="214" cy="171" r="2" fill="#E8B653" />
        <rect x="104" y="201" width="211" height="10" rx="5" fill="#AAC7D8" />
        {/* Auction paddle/card and gavel. */}
        <g transform="rotate(-9 83 165)">
          <rect x="46" y="127" width="74" height="57" rx="9" fill="#FCF0D5" />
          <path d="M65 144H101M65 154H92" stroke="#BA8731" strokeWidth="3" strokeLinecap="round" />
          <rect x="76" y="184" width="14" height="29" rx="4" fill="#D5A146" />
          <circle cx="101" cy="170" r="6" fill="#E8B653" />
        </g>
        <g transform="rotate(-35 421 145)">
          <rect x="414" y="119" width="13" height="77" rx="5" fill="#E8B653" />
          <rect x="389" y="97" width="63" height="32" rx="6" fill="#F5CC78" />
          <path d="M400 98V128M441 98V128" stroke="#BC8731" strokeWidth="4" />
        </g>
        <rect x="381" y="204" width="90" height="10" rx="5" fill="#D5A146" />
        <path d="M394 203V196C394 191 399 187 404 187H448C453 187 458 191 458 196V203" fill="#F5CC78" />
        <path d="M475 133L483 127M480 148H490M472 162L480 168" stroke="#E8B653" strokeWidth="3" strokeLinecap="round" />
        {/* Landscaping softens the property silhouette. */}
        <path d="M331 212V186M344 212V176" stroke="#98BFA7" strokeWidth="3" />
        <ellipse cx="327" cy="183" rx="9" ry="17" transform="rotate(-30 327 183)" fill="#86AE9A" />
        <ellipse cx="349" cy="178" rx="10" ry="18" transform="rotate(25 349 178)" fill="#B0CCB6" />
      </svg>
    </div>
  );
}
