import svgPaths from "./svg-typlgntifn";

function Heading() {
  return (
    <div className="h-[21px] relative shrink-0 w-full" data-name="Heading 2">
      <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[21px] left-0 not-italic text-[#101828] text-[14px] top-[-1.2px] whitespace-nowrap">SBU Credit Performance</p>
    </div>
  );
}

function Paragraph() {
  return (
    <div className="h-[16.5px] relative shrink-0 w-full" data-name="Paragraph">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[16.5px] left-0 not-italic text-[#667085] text-[11px] top-[-0.2px] whitespace-nowrap">Business unit performance across all SBUs</p>
    </div>
  );
}

function Container2() {
  return (
    <div className="absolute content-stretch flex flex-col gap-[2px] h-[39.5px] items-start left-[20px] top-[16px] w-[246.713px]" data-name="Container">
      <Heading />
      <Paragraph />
    </div>
  );
}

function TextInput() {
  return (
    <div className="absolute bg-white h-[35.6px] left-0 rounded-[10px] top-0 w-[256px]" data-name="Text Input">
      <div className="content-stretch flex items-center overflow-clip pl-[32px] pr-[12px] py-[8px] relative rounded-[inherit] size-full">
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[normal] not-italic relative shrink-0 text-[#98a2b3] text-[12px] whitespace-nowrap">Search business...</p>
      </div>
      <div aria-hidden="true" className="absolute border-[#e4e7ec] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[10px]" />
    </div>
  );
}

function Icon() {
  return (
    <div className="absolute left-[12px] size-[14px] top-[10.8px]" data-name="Icon">
      <svg className="absolute block inset-0 size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 14 14">
        <g id="Icon">
          <path d={svgPaths.p8cdb700} id="Vector" stroke="var(--stroke-0, #98A2B3)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
          <path d="M12.25 12.25L9.74167 9.74167" id="Vector_2" stroke="var(--stroke-0, #98A2B3)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.16667" />
        </g>
      </svg>
    </div>
  );
}

function Container3() {
  return (
    <div className="absolute h-[35.6px] left-[869.6px] top-[17.95px] w-[256px]" data-name="Container">
      <TextInput />
      <Icon />
    </div>
  );
}

function Container1() {
  return (
    <div className="h-[72.3px] relative shrink-0 w-full" data-name="Container">
      <div aria-hidden="true" className="absolute border-[#e4e7ec] border-b-[0.8px] border-solid inset-0 pointer-events-none" />
      <Container2 />
      <Container3 />
    </div>
  );
}

function HeaderCell() {
  return <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[30.675px] left-0 top-0 w-[231.338px]" data-name="Header Cell" />;
}

function HeaderCell1() {
  return (
    <div className="absolute bg-[#f4f0ff] border-[#e4e7ec] border-r-[0.8px] border-solid h-[30px] left-[231.2px] top-[-0.1px] w-[307px]" data-name="Header Cell">
      <p className="-translate-x-1/2 absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15px] left-[147.1px] not-italic text-[#6941c6] text-[10px] text-center top-[9.8px] tracking-[0.25px] uppercase whitespace-nowrap">Credit Performance</p>
    </div>
  );
}

function HeaderCell2() {
  return (
    <div className="absolute bg-[#f0f9ff] border-[#e4e7ec] border-r-[0.8px] border-solid h-[30px] left-[538.2px] top-[-0.1px] w-[307px]" data-name="Header Cell">
      <p className="-translate-x-1/2 absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15px] left-[150.36px] not-italic text-[#026aa2] text-[10px] text-center top-[9.8px] tracking-[0.25px] uppercase whitespace-nowrap">Cash Performance</p>
    </div>
  );
}

function HeaderCell3() {
  return (
    <div className="absolute bg-[#f0fdf4] h-[30px] left-[845.2px] top-[-0.1px] w-[300px]" data-name="Header Cell">
      <p className="-translate-x-1/2 absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15px] left-[146.53px] not-italic text-[#027a48] text-[10px] text-center top-[9.8px] tracking-[0.25px] uppercase whitespace-nowrap">Total Performance</p>
    </div>
  );
}

function TableRow() {
  return (
    <div className="absolute bg-[#f9fafb] border-[#e4e7ec] border-b-[0.8px] border-solid h-[30.675px] left-0 top-0 w-[1145.6px]" data-name="Table Row">
      <HeaderCell />
      <HeaderCell1 />
      <HeaderCell2 />
      <HeaderCell3 />
    </div>
  );
}

function HeaderCell4() {
  return (
    <div className="absolute h-[39.075px] left-0 top-0 w-[40px]" data-name="Header Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[14.286px] left-[28.82px] not-italic text-[#667085] text-[10px] text-right top-[11.4px] tracking-[0.25px] uppercase whitespace-nowrap">#</p>
    </div>
  );
}

function HeaderCell5() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[39.075px] left-[40px] top-0 w-[191.338px]" data-name="Header Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[14.286px] left-[65.76px] not-italic text-[#667085] text-[10px] text-right top-[11.4px] tracking-[0.25px] uppercase whitespace-nowrap">Business</p>
    </div>
  );
}

function HeaderCell6() {
  return (
    <div className="absolute h-[39.075px] left-[231.34px] top-0 w-[84.338px]" data-name="Header Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[14.286px] left-[72.4px] not-italic text-[#667085] text-[10px] text-right top-[11.4px] tracking-[0.25px] uppercase whitespace-nowrap">Projected</p>
    </div>
  );
}

function HeaderCell7() {
  return (
    <div className="absolute h-[39.075px] left-[315.68px] top-0 w-[115.875px]" data-name="Header Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[14.286px] left-[104.86px] not-italic text-[#667085] text-[10px] text-right top-[11.4px] tracking-[0.25px] uppercase whitespace-nowrap">month-to-date</p>
    </div>
  );
}

function HeaderCell8() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[39.075px] left-[431.55px] top-0 w-[106.588px]" data-name="Header Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[14.286px] left-[94.31px] not-italic text-[#667085] text-[10px] text-right top-[11.4px] tracking-[0.25px] uppercase whitespace-nowrap">Achievements</p>
    </div>
  );
}

function HeaderCell9() {
  return (
    <div className="absolute h-[39.075px] left-[538.14px] top-0 w-[84.338px]" data-name="Header Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[14.286px] left-[72.4px] not-italic text-[#667085] text-[10px] text-right top-[11.4px] tracking-[0.25px] uppercase whitespace-nowrap">Projected</p>
    </div>
  );
}

function HeaderCell10() {
  return (
    <div className="absolute h-[39.075px] left-[622.48px] top-0 w-[115.875px]" data-name="Header Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[14.286px] left-[104.86px] not-italic text-[#667085] text-[10px] text-right top-[11.4px] tracking-[0.25px] uppercase whitespace-nowrap">month-to-date</p>
    </div>
  );
}

function HeaderCell11() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[39.075px] left-[738.35px] top-0 w-[106.588px]" data-name="Header Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[14.286px] left-[94.31px] not-italic text-[#667085] text-[10px] text-right top-[11.4px] tracking-[0.25px] uppercase whitespace-nowrap">Achievements</p>
    </div>
  );
}

function HeaderCell12() {
  return (
    <div className="absolute h-[39.075px] left-[844.94px] top-0 w-[84.338px]" data-name="Header Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[14.286px] left-[72.4px] not-italic text-[#667085] text-[10px] text-right top-[11.4px] tracking-[0.25px] uppercase whitespace-nowrap">Projected</p>
    </div>
  );
}

function HeaderCell13() {
  return (
    <div className="absolute h-[39.075px] left-[929.28px] top-0 w-[115.875px]" data-name="Header Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[14.286px] left-[104.86px] not-italic text-[#667085] text-[10px] text-right top-[11.4px] tracking-[0.25px] uppercase whitespace-nowrap">month-to-date</p>
    </div>
  );
}

function HeaderCell14() {
  return (
    <div className="absolute h-[39.075px] left-[1045.15px] top-0 w-[100.45px]" data-name="Header Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[14.286px] left-[89px] not-italic text-[#667085] text-[10px] text-right top-[11.4px] tracking-[0.25px] uppercase whitespace-nowrap">ACHivements</p>
    </div>
  );
}

function TableRow1() {
  return (
    <div className="absolute bg-[#f9fafb] border-[#e4e7ec] border-b-[0.8px] border-solid h-[39.075px] left-0 top-[30.68px] w-[1145.6px]" data-name="Table Row">
      <HeaderCell4 />
      <HeaderCell5 />
      <HeaderCell6 />
      <HeaderCell7 />
      <HeaderCell8 />
      <HeaderCell9 />
      <HeaderCell10 />
      <HeaderCell11 />
      <HeaderCell12 />
      <HeaderCell13 />
      <HeaderCell14 />
    </div>
  );
}

function TableHeader() {
  return (
    <div className="absolute h-[69.75px] left-0 top-0 w-[1145.6px]" data-name="Table Header">
      <TableRow />
      <TableRow1 />
    </div>
  );
}

function TableCell() {
  return (
    <div className="absolute h-[37.938px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[12px] not-italic text-[#98a2b3] text-[12px] top-[9.4px] whitespace-nowrap">2</p>
    </div>
  );
}

function TableCell1() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[40px] top-0 w-[191.338px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17.143px] left-[12px] not-italic text-[#344054] text-[12px] top-[9.4px] whitespace-nowrap">ACI Consumer Electronics</p>
    </div>
  );
}

function TableCell2() {
  return (
    <div className="absolute h-[37.938px] left-[231.34px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[72.34px] not-italic text-[#d0d5dd] text-[12px] text-right top-[9.4px] whitespace-nowrap">—</p>
    </div>
  );
}

function TableCell3() {
  return (
    <div className="absolute h-[37.938px] left-[315.68px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[104.86px] not-italic text-[#475467] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.12</p>
    </div>
  );
}

function TableCell4() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[431.55px] top-0 w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[94.75px] not-italic text-[#b42318] text-[11px] text-right top-[10.2px] whitespace-nowrap">-82.7%</p>
    </div>
  );
}

function TableCell5() {
  return (
    <div className="absolute h-[37.938px] left-[538.14px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[73.29px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.12</p>
    </div>
  );
}

function TableCell6() {
  return (
    <div className="absolute h-[37.938px] left-[622.48px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[104.83px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.12</p>
    </div>
  );
}

function TableCell7() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[738.35px] top-0 w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[94.75px] not-italic text-[#b42318] text-[11px] text-right top-[10.2px] whitespace-nowrap">-82.7%</p>
    </div>
  );
}

function TableCell8() {
  return (
    <div className="absolute h-[37.938px] left-[844.94px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[73.29px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.12</p>
    </div>
  );
}

function TableCell9() {
  return (
    <div className="absolute h-[37.938px] left-[929.28px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[104.83px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.12</p>
    </div>
  );
}

function TableCell10() {
  return (
    <div className="absolute h-[37.938px] left-[1045.15px] top-0 w-[100.45px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[89.01px] not-italic text-[#b42318] text-[11px] text-right top-[10.2px] whitespace-nowrap">-82.7%</p>
    </div>
  );
}

function TableRow2() {
  return (
    <div className="absolute bg-white border-[#f2f4f7] border-b-[0.8px] border-solid h-[37.938px] left-0 top-0 w-[1145.6px]" data-name="Table Row">
      <TableCell />
      <TableCell1 />
      <TableCell2 />
      <TableCell3 />
      <TableCell4 />
      <TableCell5 />
      <TableCell6 />
      <TableCell7 />
      <TableCell8 />
      <TableCell9 />
      <TableCell10 />
    </div>
  );
}

function TableCell11() {
  return (
    <div className="absolute h-[37.938px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[12px] not-italic text-[#98a2b3] text-[12px] top-[9.4px] whitespace-nowrap">3</p>
    </div>
  );
}

function TableCell12() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[40px] top-0 w-[191.338px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17.143px] left-[12px] not-italic text-[#344054] text-[12px] top-[9.4px] whitespace-nowrap">Global Tech Supplies</p>
    </div>
  );
}

function TableCell13() {
  return (
    <div className="absolute h-[37.938px] left-[231.34px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[72.34px] not-italic text-[#d0d5dd] text-[12px] text-right top-[9.4px] whitespace-nowrap">—</p>
    </div>
  );
}

function TableCell14() {
  return (
    <div className="absolute h-[37.938px] left-[315.68px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[104.86px] not-italic text-[#475467] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.45</p>
    </div>
  );
}

function TableCell15() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[431.55px] top-0 w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[94.23px] not-italic text-[#b42318] text-[11px] text-right top-[10.2px] whitespace-nowrap">-15.3%</p>
    </div>
  );
}

function TableCell16() {
  return (
    <div className="absolute h-[37.938px] left-[538.14px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[73.2px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.45</p>
    </div>
  );
}

function TableCell17() {
  return (
    <div className="absolute h-[37.938px] left-[622.48px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[104.74px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.45</p>
    </div>
  );
}

function TableCell18() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[738.35px] top-0 w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[94.22px] not-italic text-[#b42318] text-[11px] text-right top-[10.2px] whitespace-nowrap">-15.3%</p>
    </div>
  );
}

function TableCell19() {
  return (
    <div className="absolute h-[37.938px] left-[844.94px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[73.2px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.45</p>
    </div>
  );
}

function TableCell20() {
  return (
    <div className="absolute h-[37.938px] left-[929.28px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[104.74px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.45</p>
    </div>
  );
}

function TableCell21() {
  return (
    <div className="absolute h-[37.938px] left-[1045.15px] top-0 w-[100.45px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[88.49px] not-italic text-[#b42318] text-[11px] text-right top-[10.2px] whitespace-nowrap">-15.3%</p>
    </div>
  );
}

function TableRow3() {
  return (
    <div className="absolute bg-[rgba(254,243,242,0.45)] border-[#f2f4f7] border-b-[0.8px] border-solid h-[37.938px] left-0 top-[37.94px] w-[1145.6px]" data-name="Table Row">
      <TableCell11 />
      <TableCell12 />
      <TableCell13 />
      <TableCell14 />
      <TableCell15 />
      <TableCell16 />
      <TableCell17 />
      <TableCell18 />
      <TableCell19 />
      <TableCell20 />
      <TableCell21 />
    </div>
  );
}

function TableCell22() {
  return (
    <div className="absolute h-[37.938px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[12px] not-italic text-[#98a2b3] text-[12px] top-[9.4px] whitespace-nowrap">4</p>
    </div>
  );
}

function TableCell23() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[40px] top-0 w-[191.338px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17.143px] left-[12px] not-italic text-[#344054] text-[12px] top-[9.4px] whitespace-nowrap">NextGen Gadgets</p>
    </div>
  );
}

function TableCell24() {
  return (
    <div className="absolute h-[37.938px] left-[231.34px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[72.34px] not-italic text-[#d0d5dd] text-[12px] text-right top-[9.4px] whitespace-nowrap">—</p>
    </div>
  );
}

function TableCell25() {
  return (
    <div className="absolute h-[37.938px] left-[315.68px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[104.86px] not-italic text-[#475467] text-[12px] text-right top-[9.4px] whitespace-nowrap">1.00</p>
    </div>
  );
}

function TableCell26() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[431.55px] top-0 w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[94.33px] not-italic text-[#027a48] text-[11px] text-right top-[10.2px] whitespace-nowrap">+22.5%</p>
    </div>
  );
}

function TableCell27() {
  return (
    <div className="absolute h-[37.938px] left-[538.14px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[73.29px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">1.00</p>
    </div>
  );
}

function TableCell28() {
  return (
    <div className="absolute h-[37.938px] left-[622.48px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[104.83px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">1.00</p>
    </div>
  );
}

function TableCell29() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[738.35px] top-0 w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[94.33px] not-italic text-[#027a48] text-[11px] text-right top-[10.2px] whitespace-nowrap">+22.5%</p>
    </div>
  );
}

function TableCell30() {
  return (
    <div className="absolute h-[37.938px] left-[844.94px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[73.29px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">1.00</p>
    </div>
  );
}

function TableCell31() {
  return (
    <div className="absolute h-[37.938px] left-[929.28px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[104.83px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">1.00</p>
    </div>
  );
}

function TableCell32() {
  return (
    <div className="absolute h-[37.938px] left-[1045.15px] top-0 w-[100.45px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[88.59px] not-italic text-[#027a48] text-[11px] text-right top-[10.2px] whitespace-nowrap">+22.5%</p>
    </div>
  );
}

function TableRow4() {
  return (
    <div className="absolute bg-white border-[#f2f4f7] border-b-[0.8px] border-solid h-[37.938px] left-0 top-[75.88px] w-[1145.6px]" data-name="Table Row">
      <TableCell22 />
      <TableCell23 />
      <TableCell24 />
      <TableCell25 />
      <TableCell26 />
      <TableCell27 />
      <TableCell28 />
      <TableCell29 />
      <TableCell30 />
      <TableCell31 />
      <TableCell32 />
    </div>
  );
}

function TableCell33() {
  return (
    <div className="absolute h-[37.938px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[12px] not-italic text-[#98a2b3] text-[12px] top-[9.4px] whitespace-nowrap">5</p>
    </div>
  );
}

function TableCell34() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[40px] top-0 w-[191.338px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17.143px] left-[12px] not-italic text-[#344054] text-[12px] top-[9.4px] whitespace-nowrap">Innovatech Devices</p>
    </div>
  );
}

function TableCell35() {
  return (
    <div className="absolute h-[37.938px] left-[231.34px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[72.34px] not-italic text-[#d0d5dd] text-[12px] text-right top-[9.4px] whitespace-nowrap">—</p>
    </div>
  );
}

function TableCell36() {
  return (
    <div className="absolute h-[37.938px] left-[315.68px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[104.86px] not-italic text-[#475467] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.78</p>
    </div>
  );
}

function TableCell37() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[431.55px] top-0 w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[95.11px] not-italic text-[#027a48] text-[11px] text-right top-[10.2px] whitespace-nowrap">+5.1%</p>
    </div>
  );
}

function TableCell38() {
  return (
    <div className="absolute h-[37.938px] left-[538.14px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[72.67px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.78</p>
    </div>
  );
}

function TableCell39() {
  return (
    <div className="absolute h-[37.938px] left-[622.48px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[104.21px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.78</p>
    </div>
  );
}

function TableCell40() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[738.35px] top-0 w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[95.11px] not-italic text-[#027a48] text-[11px] text-right top-[10.2px] whitespace-nowrap">+5.1%</p>
    </div>
  );
}

function TableCell41() {
  return (
    <div className="absolute h-[37.938px] left-[844.94px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[72.68px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.78</p>
    </div>
  );
}

function TableCell42() {
  return (
    <div className="absolute h-[37.938px] left-[929.28px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[104.21px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.78</p>
    </div>
  );
}

function TableCell43() {
  return (
    <div className="absolute h-[37.938px] left-[1045.15px] top-0 w-[100.45px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[89.38px] not-italic text-[#027a48] text-[11px] text-right top-[10.2px] whitespace-nowrap">+5.1%</p>
    </div>
  );
}

function TableRow5() {
  return (
    <div className="absolute bg-[rgba(254,243,242,0.45)] border-[#f2f4f7] border-b-[0.8px] border-solid h-[37.938px] left-0 top-[113.81px] w-[1145.6px]" data-name="Table Row">
      <TableCell33 />
      <TableCell34 />
      <TableCell35 />
      <TableCell36 />
      <TableCell37 />
      <TableCell38 />
      <TableCell39 />
      <TableCell40 />
      <TableCell41 />
      <TableCell42 />
      <TableCell43 />
    </div>
  );
}

function TableCell44() {
  return (
    <div className="absolute h-[37.938px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[12px] not-italic text-[#98a2b3] text-[12px] top-[9.4px] whitespace-nowrap">6</p>
    </div>
  );
}

function TableCell45() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[40px] top-0 w-[191.338px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17.143px] left-[12px] not-italic text-[#344054] text-[12px] top-[9.4px] whitespace-nowrap">FutureLink Electronics</p>
    </div>
  );
}

function TableCell46() {
  return (
    <div className="absolute h-[37.938px] left-[231.34px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[72.34px] not-italic text-[#d0d5dd] text-[12px] text-right top-[9.4px] whitespace-nowrap">—</p>
    </div>
  );
}

function TableCell47() {
  return (
    <div className="absolute h-[37.938px] left-[315.68px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[104.86px] not-italic text-[#475467] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.33</p>
    </div>
  );
}

function TableCell48() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[431.55px] top-0 w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[94.31px] not-italic text-[#b42318] text-[11px] text-right top-[10.2px] whitespace-nowrap">-40.0%</p>
    </div>
  );
}

function TableCell49() {
  return (
    <div className="absolute h-[37.938px] left-[538.14px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[72.45px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.33</p>
    </div>
  );
}

function TableCell50() {
  return (
    <div className="absolute h-[37.938px] left-[622.48px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[103.99px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.33</p>
    </div>
  );
}

function TableCell51() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[738.35px] top-0 w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[94.31px] not-italic text-[#b42318] text-[11px] text-right top-[10.2px] whitespace-nowrap">-40.0%</p>
    </div>
  );
}

function TableCell52() {
  return (
    <div className="absolute h-[37.938px] left-[844.94px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[72.45px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.33</p>
    </div>
  );
}

function TableCell53() {
  return (
    <div className="absolute h-[37.938px] left-[929.28px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[103.99px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.33</p>
    </div>
  );
}

function TableCell54() {
  return (
    <div className="absolute h-[37.938px] left-[1045.15px] top-0 w-[100.45px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[88.57px] not-italic text-[#b42318] text-[11px] text-right top-[10.2px] whitespace-nowrap">-40.0%</p>
    </div>
  );
}

function TableRow6() {
  return (
    <div className="absolute bg-white border-[#f2f4f7] border-b-[0.8px] border-solid h-[37.938px] left-0 top-[151.75px] w-[1145.6px]" data-name="Table Row">
      <TableCell44 />
      <TableCell45 />
      <TableCell46 />
      <TableCell47 />
      <TableCell48 />
      <TableCell49 />
      <TableCell50 />
      <TableCell51 />
      <TableCell52 />
      <TableCell53 />
      <TableCell54 />
    </div>
  );
}

function TableCell55() {
  return (
    <div className="absolute h-[37.938px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[12px] not-italic text-[#98a2b3] text-[12px] top-[9.4px] whitespace-nowrap">7</p>
    </div>
  );
}

function TableCell56() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[40px] top-0 w-[191.338px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17.143px] left-[12px] not-italic text-[#344054] text-[12px] top-[9.4px] whitespace-nowrap">Pioneer Tech Solutions</p>
    </div>
  );
}

function TableCell57() {
  return (
    <div className="absolute h-[37.938px] left-[231.34px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[72.34px] not-italic text-[#d0d5dd] text-[12px] text-right top-[9.4px] whitespace-nowrap">—</p>
    </div>
  );
}

function TableCell58() {
  return (
    <div className="absolute h-[37.938px] left-[315.68px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[104.86px] not-italic text-[#475467] text-[12px] text-right top-[9.4px] whitespace-nowrap">1.15</p>
    </div>
  );
}

function TableCell59() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[431.55px] top-0 w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[95.01px] not-italic text-[#027a48] text-[11px] text-right top-[10.2px] whitespace-nowrap">+12.0%</p>
    </div>
  );
}

function TableCell60() {
  return (
    <div className="absolute h-[37.938px] left-[538.14px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[73.11px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">1.15</p>
    </div>
  );
}

function TableCell61() {
  return (
    <div className="absolute h-[37.938px] left-[622.48px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[104.65px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">1.15</p>
    </div>
  );
}

function TableCell62() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[738.35px] top-0 w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[95.01px] not-italic text-[#027a48] text-[11px] text-right top-[10.2px] whitespace-nowrap">+12.0%</p>
    </div>
  );
}

function TableCell63() {
  return (
    <div className="absolute h-[37.938px] left-[844.94px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[73.11px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">1.15</p>
    </div>
  );
}

function TableCell64() {
  return (
    <div className="absolute h-[37.938px] left-[929.28px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[104.65px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">1.15</p>
    </div>
  );
}

function TableCell65() {
  return (
    <div className="absolute h-[37.938px] left-[1045.15px] top-0 w-[100.45px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[89.27px] not-italic text-[#027a48] text-[11px] text-right top-[10.2px] whitespace-nowrap">+12.0%</p>
    </div>
  );
}

function TableRow7() {
  return (
    <div className="absolute bg-[rgba(254,243,242,0.45)] border-[#f2f4f7] border-b-[0.8px] border-solid h-[37.938px] left-0 top-[189.69px] w-[1145.6px]" data-name="Table Row">
      <TableCell55 />
      <TableCell56 />
      <TableCell57 />
      <TableCell58 />
      <TableCell59 />
      <TableCell60 />
      <TableCell61 />
      <TableCell62 />
      <TableCell63 />
      <TableCell64 />
      <TableCell65 />
    </div>
  );
}

function TableCell66() {
  return (
    <div className="absolute h-[37.938px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[12px] not-italic text-[#98a2b3] text-[12px] top-[9.4px] whitespace-nowrap">8</p>
    </div>
  );
}

function TableCell67() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[40px] top-0 w-[191.338px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17.143px] left-[12px] not-italic text-[#344054] text-[12px] top-[9.4px] whitespace-nowrap">Quantum Electronics</p>
    </div>
  );
}

function TableCell68() {
  return (
    <div className="absolute h-[37.938px] left-[231.34px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[72.34px] not-italic text-[#d0d5dd] text-[12px] text-right top-[9.4px] whitespace-nowrap">—</p>
    </div>
  );
}

function TableCell69() {
  return (
    <div className="absolute h-[37.938px] left-[315.68px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[104.86px] not-italic text-[#475467] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.90</p>
    </div>
  );
}

function TableCell70() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[431.55px] top-0 w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[94.4px] not-italic text-[#027a48] text-[11px] text-right top-[10.2px] whitespace-nowrap">+8.6%</p>
    </div>
  );
}

function TableCell71() {
  return (
    <div className="absolute h-[37.938px] left-[538.14px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[72.41px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.90</p>
    </div>
  );
}

function TableCell72() {
  return (
    <div className="absolute h-[37.938px] left-[622.48px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[103.95px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.90</p>
    </div>
  );
}

function TableCell73() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[738.35px] top-0 w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[94.4px] not-italic text-[#027a48] text-[11px] text-right top-[10.2px] whitespace-nowrap">+8.6%</p>
    </div>
  );
}

function TableCell74() {
  return (
    <div className="absolute h-[37.938px] left-[844.94px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[72.41px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.90</p>
    </div>
  );
}

function TableCell75() {
  return (
    <div className="absolute h-[37.938px] left-[929.28px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[103.95px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.90</p>
    </div>
  );
}

function TableCell76() {
  return (
    <div className="absolute h-[37.938px] left-[1045.15px] top-0 w-[100.45px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[88.66px] not-italic text-[#027a48] text-[11px] text-right top-[10.2px] whitespace-nowrap">+8.6%</p>
    </div>
  );
}

function TableRow8() {
  return (
    <div className="absolute bg-white border-[#f2f4f7] border-b-[0.8px] border-solid h-[37.938px] left-0 top-[227.63px] w-[1145.6px]" data-name="Table Row">
      <TableCell66 />
      <TableCell67 />
      <TableCell68 />
      <TableCell69 />
      <TableCell70 />
      <TableCell71 />
      <TableCell72 />
      <TableCell73 />
      <TableCell74 />
      <TableCell75 />
      <TableCell76 />
    </div>
  );
}

function TableCell77() {
  return (
    <div className="absolute h-[37.938px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[12px] not-italic text-[#98a2b3] text-[12px] top-[9.4px] whitespace-nowrap">9</p>
    </div>
  );
}

function TableCell78() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[40px] top-0 w-[191.338px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17.143px] left-[12px] not-italic text-[#344054] text-[12px] top-[9.4px] whitespace-nowrap">AlphaWave Technologies</p>
    </div>
  );
}

function TableCell79() {
  return (
    <div className="absolute h-[37.938px] left-[231.34px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[72.34px] not-italic text-[#d0d5dd] text-[12px] text-right top-[9.4px] whitespace-nowrap">—</p>
    </div>
  );
}

function TableCell80() {
  return (
    <div className="absolute h-[37.938px] left-[315.68px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[104.86px] not-italic text-[#475467] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.60</p>
    </div>
  );
}

function TableCell81() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[431.55px] top-0 w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[94.54px] not-italic text-[#b42318] text-[11px] text-right top-[10.2px] whitespace-nowrap">-30.0%</p>
    </div>
  );
}

function TableCell82() {
  return (
    <div className="absolute h-[37.938px] left-[538.14px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[72.41px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.60</p>
    </div>
  );
}

function TableCell83() {
  return (
    <div className="absolute h-[37.938px] left-[622.48px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[103.95px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.60</p>
    </div>
  );
}

function TableCell84() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[738.35px] top-0 w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[94.54px] not-italic text-[#b42318] text-[11px] text-right top-[10.2px] whitespace-nowrap">-30.0%</p>
    </div>
  );
}

function TableCell85() {
  return (
    <div className="absolute h-[37.938px] left-[844.94px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[72.41px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.60</p>
    </div>
  );
}

function TableCell86() {
  return (
    <div className="absolute h-[37.938px] left-[929.28px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[103.95px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">0.60</p>
    </div>
  );
}

function TableCell87() {
  return (
    <div className="absolute h-[37.938px] left-[1045.15px] top-0 w-[100.45px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[88.8px] not-italic text-[#b42318] text-[11px] text-right top-[10.2px] whitespace-nowrap">-30.0%</p>
    </div>
  );
}

function TableRow9() {
  return (
    <div className="absolute bg-[rgba(254,243,242,0.45)] border-[#f2f4f7] border-b-[0.8px] border-solid h-[37.938px] left-0 top-[265.56px] w-[1145.6px]" data-name="Table Row">
      <TableCell77 />
      <TableCell78 />
      <TableCell79 />
      <TableCell80 />
      <TableCell81 />
      <TableCell82 />
      <TableCell83 />
      <TableCell84 />
      <TableCell85 />
      <TableCell86 />
      <TableCell87 />
    </div>
  );
}

function TableCell88() {
  return (
    <div className="absolute h-[38.338px] left-0 top-0 w-[40px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[12px] not-italic text-[#98a2b3] text-[12px] top-[9.4px] whitespace-nowrap">10</p>
    </div>
  );
}

function TableCell89() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[38.338px] left-[40px] top-0 w-[191.338px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Medium',sans-serif] font-medium leading-[17.143px] left-[12px] not-italic text-[#344054] text-[12px] top-[9.4px] whitespace-nowrap">Vanguard Electronics</p>
    </div>
  );
}

function TableCell90() {
  return (
    <div className="absolute h-[38.338px] left-[231.34px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[72.34px] not-italic text-[#d0d5dd] text-[12px] text-right top-[9.4px] whitespace-nowrap">—</p>
    </div>
  );
}

function TableCell91() {
  return (
    <div className="absolute h-[38.338px] left-[315.68px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Regular',sans-serif] font-normal leading-[17.143px] left-[104.86px] not-italic text-[#475467] text-[12px] text-right top-[9.4px] whitespace-nowrap">1.30</p>
    </div>
  );
}

function TableCell92() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[38.338px] left-[431.55px] top-0 w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[95.01px] not-italic text-[#027a48] text-[11px] text-right top-[10.2px] whitespace-nowrap">+18.2%</p>
    </div>
  );
}

function TableCell93() {
  return (
    <div className="absolute h-[38.338px] left-[538.14px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[73.29px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">1.30</p>
    </div>
  );
}

function TableCell94() {
  return (
    <div className="absolute h-[38.338px] left-[622.48px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[104.83px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">1.30</p>
    </div>
  );
}

function TableCell95() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[38.338px] left-[738.35px] top-0 w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[95.01px] not-italic text-[#027a48] text-[11px] text-right top-[10.2px] whitespace-nowrap">+18.2%</p>
    </div>
  );
}

function TableCell96() {
  return (
    <div className="absolute h-[38.338px] left-[844.94px] top-0 w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[73.29px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">1.30</p>
    </div>
  );
}

function TableCell97() {
  return (
    <div className="absolute h-[38.338px] left-[929.28px] top-0 w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[104.83px] not-italic text-[#101828] text-[12px] text-right top-[9.4px] whitespace-nowrap">1.30</p>
    </div>
  );
}

function TableCell98() {
  return (
    <div className="absolute h-[38.338px] left-[1045.15px] top-0 w-[100.45px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[89.27px] not-italic text-[#027a48] text-[11px] text-right top-[10.2px] whitespace-nowrap">+18.2%</p>
    </div>
  );
}

function TableRow10() {
  return (
    <div className="absolute bg-white border-[#f2f4f7] border-b-[0.8px] border-solid h-[38.338px] left-0 top-[303.5px] w-[1145.6px]" data-name="Table Row">
      <TableCell88 />
      <TableCell89 />
      <TableCell90 />
      <TableCell91 />
      <TableCell92 />
      <TableCell93 />
      <TableCell94 />
      <TableCell95 />
      <TableCell96 />
      <TableCell97 />
      <TableCell98 />
    </div>
  );
}

function TableBody() {
  return (
    <div className="absolute h-[341.837px] left-0 top-[69.75px] w-[1145.6px]" data-name="Table Body">
      <TableRow2 />
      <TableRow3 />
      <TableRow4 />
      <TableRow5 />
      <TableRow6 />
      <TableRow7 />
      <TableRow8 />
      <TableRow9 />
      <TableRow10 />
    </div>
  );
}

function TableCell99() {
  return (
    <div className="absolute h-[37.938px] left-0 top-[-1.6px] w-[231.338px]" data-name="Table Cell">
      <p className="absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[12px] not-italic text-[#667085] text-[12px] top-[9.8px] tracking-[0.25px] uppercase whitespace-nowrap">Grand Total</p>
    </div>
  );
}

function TableCell100() {
  return (
    <div className="absolute h-[37.938px] left-[231.34px] top-[-1.6px] w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[73.11px] not-italic text-[#101828] text-[12px] text-right top-[9.8px] whitespace-nowrap">0.00</p>
    </div>
  );
}

function TableCell101() {
  return (
    <div className="absolute h-[37.938px] left-[315.68px] top-[-1.6px] w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[104.71px] not-italic text-[#101828] text-[12px] text-right top-[9.8px] whitespace-nowrap">4289.58</p>
    </div>
  );
}

function TableCell102() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[431.55px] top-[-1.6px] w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[15.714px] left-[93.54px] not-italic text-[#027a48] text-[11px] text-right top-[9.8px] whitespace-nowrap">+18.2%</p>
    </div>
  );
}

function TableCell103() {
  return (
    <div className="absolute h-[37.938px] left-[538.14px] top-[-1.6px] w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[73.24px] not-italic text-[#101828] text-[12px] text-right top-[9.8px] whitespace-nowrap">11612.93</p>
    </div>
  );
}

function TableCell104() {
  return (
    <div className="absolute h-[37.938px] left-[622.48px] top-[-1.6px] w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[104.06px] not-italic text-[#667085] text-[12px] text-right top-[9.8px] whitespace-nowrap">10386.66</p>
    </div>
  );
}

function TableCell105() {
  return (
    <div className="absolute border-[#e4e7ec] border-r-[0.8px] border-solid h-[37.938px] left-[738.35px] top-[-1.6px] w-[106.588px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Bold',sans-serif] font-bold leading-[15.714px] left-[94.9px] not-italic text-[#027a48] text-[11px] text-right top-[10.6px] whitespace-nowrap">+11.8%</p>
    </div>
  );
}

function TableCell106() {
  return (
    <div className="absolute h-[37.938px] left-[844.94px] top-[-1.6px] w-[84.338px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[73.11px] not-italic text-[#101828] text-[12px] text-right top-[9.8px] whitespace-nowrap">4239.66</p>
    </div>
  );
}

function TableCell107() {
  return (
    <div className="absolute h-[37.938px] left-[929.28px] top-[-1.6px] w-[115.875px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[17.143px] left-[104.71px] not-italic text-[#101828] text-[12px] text-right top-[9.8px] whitespace-nowrap">4289.58</p>
    </div>
  );
}

function TableCell108() {
  return (
    <div className="absolute h-[37.938px] left-[1045.15px] top-[-1.6px] w-[100.45px]" data-name="Table Cell">
      <p className="-translate-x-full absolute font-['Inter:Bold',sans-serif] font-bold leading-[15.714px] left-[89.16px] not-italic text-[#027a48] text-[11px] text-right top-[10.6px] whitespace-nowrap">+11.8%</p>
    </div>
  );
}

function TableRow11() {
  return (
    <div className="absolute bg-[#f2f4f7] border-[#e4e7ec] border-solid border-t-[1.6px] h-[37.938px] left-0 top-[411.59px] w-[1145.6px]" data-name="Table Row">
      <TableCell99 />
      <TableCell100 />
      <TableCell101 />
      <TableCell102 />
      <TableCell103 />
      <TableCell104 />
      <TableCell105 />
      <TableCell106 />
      <TableCell107 />
      <TableCell108 />
    </div>
  );
}

function Table() {
  return (
    <div className="h-[449.525px] overflow-clip relative shrink-0 w-full" data-name="Table">
      <TableHeader />
      <TableBody />
      <TableRow11 />
    </div>
  );
}

export default function Container() {
  return (
    <div className="bg-white relative rounded-[14px] size-full" data-name="Container">
      <div className="content-stretch flex flex-col items-start overflow-clip p-[0.8px] relative rounded-[inherit] size-full">
        <Container1 />
        <Table />
      </div>
      <div aria-hidden="true" className="absolute border-[#e4e7ec] border-[0.8px] border-solid inset-0 pointer-events-none rounded-[14px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.1),0px_1px_2px_-1px_rgba(0,0,0,0.1)]" />
    </div>
  );
}