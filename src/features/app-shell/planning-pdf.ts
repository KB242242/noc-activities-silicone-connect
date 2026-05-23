import { eachDayOfInterval, endOfMonth, format, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import jsPDF from 'jspdf';

import { getIndividualRestAgent, getShiftScheduleForDate } from '@/features/app-shell/planning-utils';
import type { UserProfile } from '@/features/app-shell/types';

export async function downloadOvertimePdf(params: {
  user: UserProfile;
  overtimeMonth: Date;
}): Promise<void> {
  const { user, overtimeMonth } = params;

  const fullName = `${user.lastName || ''} ${user.firstName || ''}`.trim();
  const doc = new jsPDF('p', 'mm', 'a4');
  const monthNames = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];
  const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  const pageWidth = 210;
  const margin = 10;

  const logoWidth = 18;
  const titleText = 'SILICONE CONNECT';
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const titleWidth = doc.getTextWidth(titleText);
  const totalHeaderWidth = logoWidth + 3 + titleWidth;
  const headerStartX = (pageWidth - totalHeaderWidth) / 2;

  try {
    const logoImg = new Image();
    logoImg.src = '/faicone_sc.png';
    await new Promise((resolve) => {
      logoImg.onload = resolve;
      logoImg.onerror = resolve;
    });

    if (logoImg.complete && logoImg.naturalWidth > 0) {
      doc.addImage(logoImg, 'PNG', headerStartX, 10, logoWidth, 18);
    }
  } catch {
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(headerStartX, 10, logoWidth, 18, 2, 2, 'F');
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(titleText, headerStartX + logoWidth + 3, 21);

  try {
    const barreImg = new Image();
    barreImg.src = '/Image_titre_barre_heure_sup.png';
    await new Promise((resolve) => {
      barreImg.onload = resolve;
      barreImg.onerror = resolve;
    });

    if (barreImg.complete && barreImg.naturalWidth > 0) {
      doc.addImage(barreImg, 'PNG', margin, 35, pageWidth - (margin * 2), 10);
    } else {
      doc.setFillColor(59, 130, 246);
      doc.roundedRect(margin, 35, pageWidth - (margin * 2), 10, 2, 2, 'F');
    }
  } catch {
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(margin, 35, pageWidth - (margin * 2), 10, 2, 2, 'F');
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`MOIS : ${monthNames[overtimeMonth.getMonth()].toUpperCase()} ${overtimeMonth.getFullYear()}`, pageWidth / 2, 52, { align: 'center' });

  const monthStart = startOfMonth(overtimeMonth);
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const records: Array<[string, string, string, string, string, string, string, string]> = [];

  days.forEach((d) => {
    const schedule = getShiftScheduleForDate(user.shift!.name, d);
    if (schedule.isWorking) {
      const restInfo = getIndividualRestAgent(user.shift!.name, d);
      if (!restInfo || restInfo.agentName !== user.name) {
        const dayName = dayNames[d.getDay()];
        const dateStr = format(d, 'd/M/yyyy');
        let heureDebut: string;
        let heureFin: string;
        let comment: string;
        if (schedule.dayType === 'DAY_SHIFT') {
          heureDebut = '17:00';
          heureFin = '19:00';
          comment = 'SHIFT JOUR';
        } else {
          heureDebut = '05:00';
          heureFin = '07:00';
          comment = 'SHIFT NUIT';
        }
        records.push([dayName, dateStr, heureDebut, heureFin, '2:00', 'Supervision au NOC', 'DADDY AZUMY', comment]);
      }
    }
  });

  const totalHours = records.length * 2;

  const colWidths = [20, 16, 16, 22, 20, 16, 28, 28, 24];
  const tableStartY = 60;
  const rowHeight = 7;
  const headerHeight = 9;
  const headers = ['NOM et PRENOM', 'JOURS', 'Date', 'HEURE DU DEBUT', 'HEURE DE FIN', 'DUREE(H)', 'RAISONS', 'APPROBATION', 'COMMENTAIRES'];
  const totalRowsHeight = records.length * rowHeight;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);

  doc.setFillColor(168, 198, 238);
  doc.rect(margin, tableStartY, pageWidth - (margin * 2), headerHeight, 'F');
  doc.rect(margin, tableStartY, pageWidth - (margin * 2), headerHeight);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');

  let x = margin;
  for (let i = 0; i < headers.length; i += 1) {
    if (i > 0) {
      doc.line(x, tableStartY, x, tableStartY + headerHeight);
    }
    doc.text(headers[i], x + colWidths[i] / 2, tableStartY + 5.5, { align: 'center' });
    x += colWidths[i];
  }

  const bodyStartY = tableStartY + headerHeight;

  for (let rowIndex = 0; rowIndex < records.length; rowIndex += 1) {
    if (rowIndex % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(margin + colWidths[0], bodyStartY + (rowIndex * rowHeight), pageWidth - (margin * 2) - colWidths[0], rowHeight, 'F');
    }
  }

  doc.setFillColor(245, 247, 250);
  doc.rect(margin, bodyStartY, colWidths[0], totalRowsHeight, 'F');
  doc.rect(margin, bodyStartY, colWidths[0], totalRowsHeight);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(0, 0, 0);

  const col0EndX = margin + colWidths[0];

  for (let rowIndex = 0; rowIndex < records.length; rowIndex += 1) {
    const row = records[rowIndex];
    const currentY = bodyStartY + (rowIndex * rowHeight);

    doc.line(col0EndX, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);

    x = col0EndX;
    for (let colIndex = 1; colIndex < 9; colIndex += 1) {
      doc.line(x, currentY, x, currentY + rowHeight);
      doc.text(row[colIndex - 1], x + colWidths[colIndex] / 2, currentY + 4.5, { align: 'center' });
      x += colWidths[colIndex];
    }
  }

  doc.line(col0EndX, bodyStartY, col0EndX, bodyStartY + totalRowsHeight);
  doc.line(pageWidth - margin, bodyStartY, pageWidth - margin, bodyStartY + totalRowsHeight);

  const nomEmploye = fullName.toUpperCase();
  const cellX = margin;
  const cellY = bodyStartY;
  const cellWidth = colWidths[0];
  const cellHeight = totalRowsHeight;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);

  const textX = cellX + (cellWidth / 2) + 13;
  const textY = cellY + (cellHeight / 2);

  doc.text(nomEmploye, textX, textY, {
    align: 'center',
    angle: 90,
  });

  const tableEndY = bodyStartY + totalRowsHeight;
  const totalY = tableEndY + 5;

  doc.setFillColor(168, 198, 238);
  doc.setGState(new (doc as any).GState({ opacity: 0.6 }));
  doc.rect(margin, totalY, pageWidth - (margin * 2), 10, 'F');
  doc.setGState(new (doc as any).GState({ opacity: 1 }));

  doc.setDrawColor(0, 0, 0);
  doc.rect(margin, totalY, pageWidth - (margin * 2), 10);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('TOTAL DES HEURES', margin + 45, totalY + 6.5, { align: 'center' });
  doc.text(`${totalHours}:00:00`, pageWidth - margin - 45, totalY + 6.5, { align: 'center' });

  const signatureY = totalY + 50;
  const sigWidth = (pageWidth - (margin * 2)) / 4;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');

  const sigLabels = [
    "Signature de l'agent",
    'Signature de Superviseur',
    'Signature de Directeur Technique',
    'Signature du Ressources Humaines',
  ];

  sigLabels.forEach((sig, i) => {
    const sigX = margin + (i * sigWidth) + sigWidth / 2;
    doc.line(sigX - 20, signatureY - 5, sigX + 20, signatureY - 5);
    doc.text(sig, sigX, signatureY, { align: 'center' });
  });

  doc.save(`heures_sup_${fullName.replace(/\s+/g, '_')}_${format(overtimeMonth, 'MM_yyyy')}.pdf`);
}

export async function downloadPlanningPdf(params: {
  currentMonth: Date;
}): Promise<void> {
  const { currentMonth } = params;
  const doc = new jsPDF('l', 'mm', 'a4');
  const monthNames = ['Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'];

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 10;

  const logoWidth = 18;
  const titleText = 'SILICONE CONNECT';
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const titleWidth = doc.getTextWidth(titleText);
  const totalHeaderWidth = logoWidth + 5 + titleWidth;
  const headerStartX = (pageWidth - totalHeaderWidth) / 2;

  try {
    const logoImg = new Image();
    logoImg.src = '/faicone_sc.png';
    await new Promise((resolve) => {
      logoImg.onload = resolve;
      logoImg.onerror = resolve;
    });

    if (logoImg.complete && logoImg.naturalWidth > 0) {
      doc.addImage(logoImg, 'PNG', headerStartX, 8, logoWidth, 18);
    }
  } catch {
    doc.setFillColor(59, 130, 246);
    doc.roundedRect(headerStartX, 8, logoWidth, 18, 2, 2, 'F');
  }

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(titleText, headerStartX + logoWidth + 5, 20);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PLANNING DES AGENTS NOC', pageWidth / 2, 35, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Mois de ${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`, pageWidth / 2, 43, { align: 'center' });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const numDays = days.length;

  const shiftColors: Record<'A' | 'B' | 'C', { light: [number, number, number]; dark: [number, number, number] }> = {
    A: { light: [219, 234, 254], dark: [59, 130, 246] },
    B: { light: [254, 249, 195], dark: [234, 179, 8] },
    C: { light: [220, 252, 231], dark: [34, 197, 94] },
  };
  const restColor: [number, number, number] = [229, 231, 235];
  const nightDarkColors: Record<'A' | 'B' | 'C', [number, number, number]> = {
    A: [30, 64, 175],
    B: [161, 98, 7],
    C: [22, 101, 52],
  };

  const tableStartY = 52;
  const rowHeight = 12;
  const headerHeight = 10;
  const dayColWidth = (pageWidth - margin * 2 - 30) / numDays;
  const shiftColWidth = 30;

  doc.setFillColor(59, 130, 246);
  doc.rect(margin, tableStartY, pageWidth - margin * 2, headerHeight, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.rect(margin, tableStartY, shiftColWidth, headerHeight);

  days.forEach((day, idx) => {
    const x = margin + shiftColWidth + idx * dayColWidth;
    const dayNum = format(day, 'd');
    const dayName = format(day, 'EEE', { locale: fr }).substring(0, 3).toUpperCase();

    doc.rect(x, tableStartY, dayColWidth, headerHeight);
    doc.text(dayName, x + dayColWidth / 2, tableStartY + 4, { align: 'center' });
    doc.text(dayNum, x + dayColWidth / 2, tableStartY + 8, { align: 'center' });
  });

  const bodyStartY = tableStartY + headerHeight;

  ['A', 'B', 'C'].forEach((shiftName, shiftIdx) => {
    const rowY = bodyStartY + shiftIdx * rowHeight;

    if (shiftIdx % 2 === 0) {
      doc.setFillColor(249, 250, 251);
      doc.rect(margin, rowY, pageWidth - margin * 2, rowHeight, 'F');
    }

    doc.setFillColor(...shiftColors[shiftName as keyof typeof shiftColors].dark);
    doc.rect(margin, rowY, shiftColWidth, rowHeight, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`Shift ${shiftName}`, margin + shiftColWidth / 2, rowY + rowHeight / 2 + 2, { align: 'center' });

    days.forEach((day, dayIdx) => {
      const x = margin + shiftColWidth + dayIdx * dayColWidth;
      const schedule = getShiftScheduleForDate(shiftName, day);
      const restInfo = getIndividualRestAgent(shiftName, day);

      let bgColor: [number, number, number];
      let textColor: [number, number, number] = [0, 0, 0];
      let cellText = '';

      if (schedule.isCollectiveRest) {
        bgColor = restColor;
        cellText = 'R';
        textColor = [107, 114, 128];
      } else if (schedule.dayType === 'DAY_SHIFT') {
        bgColor = shiftColors[shiftName as keyof typeof shiftColors].light;
        cellText = 'J';
      } else {
        bgColor = nightDarkColors[shiftName as keyof typeof nightDarkColors];
        cellText = 'N';
        textColor = [255, 255, 255];
      }

      doc.setFillColor(...bgColor);
      doc.rect(x, rowY, dayColWidth, rowHeight, 'F');

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      doc.rect(x, rowY, dayColWidth, rowHeight);

      doc.setTextColor(...textColor);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(cellText, x + dayColWidth / 2, rowY + rowHeight / 2 + 2, { align: 'center' });

      if (restInfo) {
        doc.setFontSize(5);
        doc.setTextColor(234, 88, 12);
        doc.text('•', x + dayColWidth / 2, rowY + rowHeight - 2, { align: 'center' });
      }
    });
  });

  const legendY = bodyStartY + 3 * rowHeight + 10;

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('LEGENDE:', margin, legendY);

  const legendItems: Array<{ label: string; color: [number, number, number] }> = [
    { label: 'J = Jour (07h00 - 19h00)', color: [219, 234, 254] },
    { label: 'N = Nuit (19h00 - 07h00)', color: [30, 64, 175] },
    { label: 'R = Repos', color: [229, 231, 235] },
  ];

  let legendX = margin + 25;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');

  legendItems.forEach((item) => {
    doc.setFillColor(...item.color);
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.2);
    doc.rect(legendX, legendY + 3, 10, 6, 'FD');

    doc.setTextColor(0, 0, 0);
    doc.text(item.label, legendX + 12, legendY + 7.5);

    legendX += 70;
  });

  const teamsY = legendY + 18;
  const teamWidth = (pageWidth - margin * 2) / 3;

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');

  const teams = {
    A: ['Alaine ODZONDO', 'Emma-Casimir NDONGO', 'Luca MOUSSOUNDA', 'Jose NGONKOLI'],
    B: ['Sara MADY', 'Severin NDANDOU', 'Furys DIAMANA', 'Marly POUABOUD'],
    C: ["Lapreuve N'SANA", 'Audrey NDINGA', 'BATA MADINGOU Ange Kevine', 'Lotti SEHOSSOLO'],
  };

  Object.entries(teams).forEach(([shiftKey, members], idx) => {
    const x = margin + idx * teamWidth;

    doc.setFillColor(...shiftColors[shiftKey as keyof typeof shiftColors].dark);
    doc.rect(x, teamsY, teamWidth - 5, 6, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.text(`EQUIPE SHIFT ${shiftKey}:`, x + 2, teamsY + 4);

    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    members.forEach((member, memberIdx) => {
      doc.text(`- ${member}`, x + 2, teamsY + 10 + memberIdx * 4);
    });
  });

  const hoursY = teamsY + 28;
  const hoursTableWidth = (pageWidth - margin * 2) / 3 - 5;

  const calculateShiftHours = (shiftName: string) => {
    let jourCount = 0;
    let nuitCount = 0;

    days.forEach((day) => {
      const schedule = getShiftScheduleForDate(shiftName, day);
      if (!schedule.isCollectiveRest) {
        if (schedule.dayType === 'DAY_SHIFT') {
          jourCount += 1;
        } else {
          nuitCount += 1;
        }
      }
    });

    const workingDays = jourCount + nuitCount;
    const heuresNormales = workingDays * 8;
    const heuresSup = workingDays * 2;
    const heuresTotales = heuresNormales + heuresSup;

    return { jourCount, nuitCount, workingDays, heuresNormales, heuresSup, heuresTotales };
  };

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('RECAPITULATIF DES HEURES DE TRAVAIL', margin, hoursY);

  const hoursHeaderY = hoursY + 4;

  ['A', 'B', 'C'].forEach((shiftName, idx) => {
    const x = margin + idx * (hoursTableWidth + 5);
    const hours = calculateShiftHours(shiftName);

    doc.setFillColor(...shiftColors[shiftName as keyof typeof shiftColors].dark);
    doc.rect(x, hoursHeaderY, hoursTableWidth, 5, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(`SHIFT ${shiftName}`, x + hoursTableWidth / 2, hoursHeaderY + 3.5, { align: 'center' });

    const tableBodyY = hoursHeaderY + 5;
    doc.setFillColor(245, 245, 245);
    doc.rect(x, tableBodyY, hoursTableWidth / 3, 5, 'F');
    doc.rect(x + hoursTableWidth / 3, tableBodyY, hoursTableWidth / 3, 5, 'F');
    doc.rect(x + 2 * hoursTableWidth / 3, tableBodyY, hoursTableWidth / 3, 5, 'F');

    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.1);
    doc.rect(x, tableBodyY, hoursTableWidth, 5);
    doc.line(x + hoursTableWidth / 3, tableBodyY, x + hoursTableWidth / 3, tableBodyY + 5);
    doc.line(x + 2 * hoursTableWidth / 3, tableBodyY, x + 2 * hoursTableWidth / 3, tableBodyY + 5);

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'bold');
    doc.text('HEURES NORMALES', x + hoursTableWidth / 6, tableBodyY + 3.5, { align: 'center' });
    doc.text('HEURES SUP', x + hoursTableWidth / 2, tableBodyY + 3.5, { align: 'center' });
    doc.text('HEURES TOTALES', x + 5 * hoursTableWidth / 6, tableBodyY + 3.5, { align: 'center' });

    const valuesY = tableBodyY + 5;
    doc.setFillColor(255, 255, 255);
    doc.rect(x, valuesY, hoursTableWidth, 6, 'F');

    doc.setDrawColor(180, 180, 180);
    doc.rect(x, valuesY, hoursTableWidth, 6);
    doc.line(x + hoursTableWidth / 3, valuesY, x + hoursTableWidth / 3, valuesY + 6);
    doc.line(x + 2 * hoursTableWidth / 3, valuesY, x + 2 * hoursTableWidth / 3, valuesY + 6);

    doc.setTextColor(59, 130, 246);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`${hours.heuresNormales}h`, x + hoursTableWidth / 6, valuesY + 4, { align: 'center' });

    doc.setTextColor(234, 88, 12);
    doc.text(`${hours.heuresSup}h`, x + hoursTableWidth / 2, valuesY + 4, { align: 'center' });

    doc.setTextColor(22, 163, 74);
    doc.text(`${hours.heuresTotales}h`, x + 5 * hoursTableWidth / 6, valuesY + 4, { align: 'center' });

    doc.setTextColor(100, 100, 100);
    doc.setFontSize(5);
    doc.setFont('helvetica', 'normal');
    doc.text(`${hours.jourCount}J + ${hours.nuitCount}N = ${hours.workingDays}j`, x + hoursTableWidth / 2, valuesY + 10, { align: 'center' });
  });

  const signatureY = hoursY + 35;

  const sigBoxWidth = 55;
  const sigBoxHeight = 15;
  const sigBoxX = pageWidth - margin - sigBoxWidth;

  doc.setFillColor(252, 252, 252);
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.2);
  doc.rect(sigBoxX, signatureY, sigBoxWidth, sigBoxHeight, 'FD');

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('SUPERVISEUR NOC', sigBoxX + sigBoxWidth / 2, signatureY + 4, { align: 'center' });

  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.15);
  doc.line(sigBoxX + 5, signatureY + 9, sigBoxX + sigBoxWidth - 5, signatureY + 9);

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(6);
  doc.setFont('helvetica', 'bold');
  doc.text('Theresia BABINDAMANA', sigBoxX + sigBoxWidth / 2, signatureY + 13, { align: 'center' });

  const now = new Date();
  const footerY = pageHeight - 8;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(107, 114, 128);

  doc.text(`Genere le ${format(now, 'dd/MM/yyyy')} a ${format(now, 'HH:mm')}`, margin, footerY);

  doc.save(`planning_noc_${format(currentMonth, 'MM_yyyy')}.pdf`);
}
