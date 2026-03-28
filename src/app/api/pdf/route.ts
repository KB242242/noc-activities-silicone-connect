import { NextRequest, NextResponse } from 'next/server';

// Note: In a real application, we would use jspdf or similar
// For this demo, we'll return the PDF data as JSON that can be used client-side

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userName, month, year, records, totalHours, totalDays } = body;

    if (!userId || !userName || !month || !year) {
      return NextResponse.json({ 
        success: false, 
        error: 'Données manquantes' 
      }, { status: 400 });
    }

    const monthNames = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];

    // Generate PDF data structure
    const pdfData = {
      title: 'FEUILLE D\'HEURES SUPPLÉMENTAIRES',
      company: 'Silicone Connect',
      department: 'NOC - Network Operations Center',
      
      employee: {
        name: userName,
        month: monthNames[month - 1],
        year: year
      },
      
      details: records.map((record: { 
        date: string; 
        dayOfWeek: string; 
        dayType: string; 
        duration: number;
        startTime: string;
      }) => ({
        jour: record.dayOfWeek,
        date: record.date,
        debut: record.dayType === 'DAY_SHIFT' ? '07:00' : '18:00',
        fin: record.dayType === 'DAY_SHIFT' ? '08:00' : '19:00',
        duree: '2h',
        raison: 'Supervision NOC',
        commentaire: record.dayType === 'DAY_SHIFT' ? 'Shift de Jour' : 'Shift de Nuit'
      })),
      
      summary: {
        totalHeures: `${totalHours}h`,
        totalJours: totalDays,
        approbation: 'Daddy AZUMY',
        dateGeneration: new Date().toISOString().split('T')[0]
      },
      
      footer: {
        signature: 'Signature du Superviseur',
        date: 'Date d\'approbation'
      }
    };

    return NextResponse.json({
      success: true,
      pdfData,
      filename: `heures_sup_${userName}_${month}_${year}.pdf`
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur lors de la génération du PDF' 
    }, { status: 500 });
  }
}
