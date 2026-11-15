'use strict';
/* Datos iniciales de Transportes Blue CJ, tomados de Libro1.xlsx (hojas PERSONAL y UNIDADES).
   Solo se usan la primera vez o al elegir "Restaurar datos del Excel" en Configuración. */
const initialData = (() => {
  // placa, nombre, documento, nacimiento (número de serie de Excel), puesto, monto diario, celular
  const PERSONAL = [
    ['ABR892', 'JHAN CARLOS REATEGUI PINEDA', '47174432', 33814, 'AUXILIAR', 65, '+51 970 356 397'],
    ['ABR892', 'LUIS FERNANDO SOTO CAMAYO', '76656136', 34859, 'ARMADOR', 80, '+51 940 816 979'],
    ['ABR892', 'NILTHON CESAR ALOR HERRERA', '40786705', 29241, 'CONDUCTOR', 95, '+51 918 711 636'],
    ['ABR892', 'ALBERT JESUS HUAYLLAHUAMAN VARGAS', '75272779', 37676, 'LIQUIDADOR', 85, '+51 929 195 524'],
    ['AXB802', 'RODRIGO MEZA RUIZ', '74536656', 34898, 'LIQUIDADOR', 0, '+51 943 376 909'],
    ['AXB802', 'FRANKLIN MICHEL CRUZADO MAURICIO', '48570443', 34629, 'CONDUCTOR', 0, '+51 927 745 359'],
    ['AXB802', 'ALEX ALBERTO SIPION ESCOBEDO', '76203823', 34546, 'ARMADOR', 0, '+51 989 000 054'],
    ['AXB802', 'JOSE FELICIANO YACTAYO GARCIA', '61527413', 0, 'AUXILIAR', 0, ''],
    ['BZH811', 'JAHIR ALEXIS ASCUE DAVILA', '72459466', 36851, 'LIQUIDADOR', 85, '+51 924 382 772'],
    ['BZH811', 'JUAN CARLOS ÑAUPARI MARTELL', '42945703', 31085, 'AUXILIAR', 70, '+51 925 559 504'],
    ['BZH811', 'ANGEL DANIEL ICHOCAN MEJIA', '42897359', 30880, 'ARMADOR', 80, '+51 960 596 964'],
    ['BZH811', 'BENJAMIN FERNANDEZ TAMAY', '09674588', 26492, 'CONDUCTOR', 95, '+51 941 972 504'],
    ['CJI721', 'LUIS OSWALDO PALOMINO RAMIREZ', '78887907', 36298, 'CONDUCTOR', 95, '+51 927 448 243'],
    ['CJI721', 'JHONATAN PERCY QUISPE RAMIREZ', '77391447', 35277, 'AUXILIAR', 60, '+51 918 139 500'],
    ['CJI721', 'BRYAN PONCE HURTADO', '74043653', 0, 'LIQUIDADOR', 80, '+51 946 772 944'],
    ['CJI721', 'ARTURO SALES MONTENEGRO', '16685484', 26070, 'ARMADOR', 85, '+51 942 667 658'],
    ['CKO923', 'DIEGO RONALD SALAZAR MANCILLA', '48079764', 34335, 'CONDUCTOR', 100, '+51 930 156 250'],
    ['CKO923', 'ADAN FERNANDEZ TAMAY', '28106073', 28342, 'AUXILIAR', 70, '+51 944 561 485'],
    ['CKO923', 'CARLOS DANIEL FERNANDEZ RAMOS', '71850005', 37899, 'LIQUIDADOR', 85, '+51 928 886 497'],
    ['CKO923', 'JESUS ARROYO', '', 0, 'ARMADOR', 80, '+51 923 172 254'],
    ['D1N926', 'JUAN RAÚL PERALTA CONTRERAS', '71690828', 36237, 'AUXILIAR', 65, '+51 936 436 287'],
    ['D1N926', 'BERTIN ALARCON CUBAS', '76503262', 34543, 'COND.-LIQUI.', 105, '+51 943 289 487'],
    ['D1N926', 'JHEFERSON JAIR LALOPU MAZA', '61523792', 39752, 'AUXILIAR', 60, '+51 929 972 808'],
    ['D1N926', 'GABRIEL CAMPOS', 'CE - 008619264', 0, 'ARMADOR', 75, '+51 900 523 477'],
    ['D4Q858', 'JEAN PIERRE ZAMBRANO LARICO', '73353734', 36227, 'ARMADOR', 80, '+51 945 297 404'],
    ['D4Q858', 'RENZO JOSÉ ABREU TOLOZA', 'CE - 004077334', 0, 'CONDUCTOR', 100, '+51 992 800 420'],
    ['D4Q858', 'RAY DE JESÚS ABREU TOLOZA', 'CE - 003234311', 0, 'LIQUIDADOR', 80, '+51 933 425 698'],
    ['D4Q858', 'CARLOS BOGADO', '', 0, 'AUXILIAR', 70, '+51 933 583 092'],
    ['D6W711', 'JEREMY CHRISTIAN PAOLO LAVERIANO VILCA', '76603527', 37434, 'AUXILIAR', 0, '+51 902 169 335'],
    ['D6W711', 'MARIA DEL PILAR SAAVEDRA HUAYTALLA', '75853052', 36219, 'ARMADOR', 0, ''],
    ['D6W711', 'YHAN CLIDER RAYMUNDO MAURICIO', '76232470', 35897, 'COND.-LIQUI.', 0, '+51 927 365 244'],
    ['D6W711', 'DEYNER', '', 0, '', 0, ''],
    ['F6F730', 'MIGUEL ANGEL OBANDO JACOBI', '76685704', 35590, 'ARMADOR', 85, '+51 969 398 300'],
    ['F6F730', 'JUAN YERSON FERNANDEZ RAMOS', '71850017', 35525, 'LIQUIDADOR', 85, '+51 917 024 609'],
    ['F6F730', 'JOSETH ANTHONY CRUZ PALOMINO', '74953897', 37708, 'AUXILIAR', 70, ''],
    ['F6F730', 'JHONATAN ALFREDO MERINO FERNANDEZ', '72281105', 34369, 'CONDUCTOR', 100, '+51 968 356 644'],
    ['CPS907', 'BRYAN ALFONSO ALANIA COTERA', '45999520', 32816, 'CONDUCTOR', 120, '+51 949 419 766'],
    ['CPS907', 'DENNIS PACOTAYPE CABANA', '76540787', 0, 'LIQUIDADOR', 85, '+51 901 254 056'],
    ['CPS907', 'ADOLFO MAMANI CUTISACA', '41797878', 29636, 'ARMADOR', 85, '+51 960 636 993'],
    ['CPS907', 'HENRRY VICTOR PILLPA MOLINA', '47429234', 33572, 'AUXILIAR', 70, '+51 949 470 531'],
    ['A6R833', 'MELCIADES VELASQUE LISUNDE', '07048107', 0, 'CONDUCTOR', 0, '+51 917 611 218'],
    ['A6R833', 'JOSE ORLANDO RODRIGUEZ PORRAS', '73306159', 0, 'AUXILIAR', 0, '+51 983 054 874'],
    ['BZA739', 'JENS RUZBEL CATALAN MARTEL', '73660030', 0, 'CONDUCTOR', 70, '+51 923 893 661'],
    ['BZA739', 'ERICK ALEXANDER SALAZAR MAZA', '75753539', 0, 'AUXILIAR', 60, '+51 935 679 009'],
    ['CD', 'VICTOR GUSTAVO CORTEZ FLORES', '10787009', 0, 'COORDINADOR', 90, '+51 983 598 887'],
    ['CD', 'LEONARDO GERMAIN TORRES CCENTE', '74531092', 0, 'COORDINADOR', 55, '+51 967 670 786'],
    ['CD', 'JAVIER JESUS JARA SUAREZ', '72164429', 0, 'DUEÑO', 0, '+51 999 017 898'],
    ['CD', 'ELOISA LIDIA CHAPOÑAN ROMERO', '75488093', 0, 'DUEÑA', 0, '+51 924 276 051']
  ];
  // placa, modalidad, socio, propietario, marca, modelo, año, n.º de serie, TUC, papeletas
  const UNIDADES = [
    ['A6R833', 'T1', 'Frank Cruzado', 'Evelyn Mauricio Melgarejo', 'Hyundai', 'H100', 2010, 'KMFZAX7HAAU579141', '15M24041767E', 0],
    ['ABR892', 'T2', 'Delson Cuica', 'Delson Cuica Mendez', 'Hyundai', 'HD78', 2014, 'KMFGA17PPEC239050', '15106860', 0],
    ['AXB802', 'T2', 'Frank Cruzado', 'Evelyn Mauricio Melgarejo', 'JAC', 'HFC1042KN', 2018, 'LJ11KDBC2J8002439', '15M21021976E', 0],
    ['BZA739', 'T1', 'Transporte Chapoñan', 'Eloisa Chapoñan Romero', 'Hyundai', 'H100', 2024, 'KMFZAX7KARU112729', '15M24019078E', 0],
    ['BZH811', 'T2', 'Dennis Paco', 'Adolfo Pacotaype Tucno', 'Dongfeng', 'DF 1016L', 2024, 'RA204179', '15M24024537E', 0],
    ['CJI721', 'T2', 'Transporte Chapoñan', 'Eloisa Chapoñan Romero', 'JAC', 'HFC1040KN', 2026, 'LJ11KDBD2T1701199', '15M25071406E', 0],
    ['CKO923', 'T2', 'Cristhian Lopez', 'Cristhian Jordy Lopez Porras', 'JAC', 'HFC1040KN', 2026, 'LJ11KDBD7T1702011', '15M26014027E', 0],
    ['CPS907', 'T2', 'Transporte Chapoñan', 'Eloisa Chapoñan Romero', 'JAC', 'HFC1071KN', 2027, 'LJ11RFCD6V1100774', '15M26063005E', 0],
    ['D1N926', 'T2', 'Transporte Chapoñan', 'Eloisa Chapoñan Romero', 'JAC', 'HFC1040KN', 2011, 'LJ11KBBC9B9020209', '15M25004176E', 0],
    ['D4Q858', 'T2', 'Transporte Chapoñan', 'Eloisa Chapoñan Romero', 'JAC', 'HFC1061K', 2011, 'LJ11KBBC1B1028819', '151732755', 0],
    ['D6W711', 'T2', 'Frank Cruzado', 'Evelyn Mauricio Melgarejo', 'Mitsubishi', 'Canter Turbo TD T5', 2007, 'JLBFE84PE7KU00253', '15M22011910E', 1],
    ['F6F730', 'T2', 'Delson Cuica', 'Delson Cuica Mendez', 'Hyundai', 'HD65', 2013, 'KMFGA17FPDC225769', '15M24007116E', 0]
  ];
  const ROLES = { 'CONDUCTOR': 'Conductor', 'LIQUIDADOR': 'Liquidador', 'ARMADOR': 'Armador', 'AUXILIAR': 'Auxiliar', 'COND.-LIQUI.': 'Conductor-Liquidador', 'COORDINADOR': 'Coordinador', 'DUEÑO': 'Dueño', 'DUEÑA': 'Dueña', '': 'Sin definir' };
  const titleCase = s => s.toLowerCase().split(' ').map(w => /^(de|del|la)$/.test(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const serialToDate = n => n ? new Date(Date.UTC(1899, 11, 30) + n * 86400000).toISOString().slice(0, 10) : '';

  return () => {
    const people = PERSONAL.map((r, i) => ({ id: 'p' + i, name: titleCase(r[1]), dni: r[2], birth: serialToDate(r[3]), role: ROLES[r[4]], rate: r[5], phone: r[6], unit: r[0] === 'CD' ? '' : 'u-' + r[0], start: '', license: '', licenseExpiry: '', status: 'Activo', photo: '' }));
    const trucks = UNIDADES.map(u => ({ id: 'u-' + u[0], plate: u[0], modalidad: u[1], socio: u[2], owner: u[3], brand: u[4], model: u[5], year: u[6], serie: u[7], tonBruto: '', tonNeto: '', km: 0, nextOil: 0, papeletas: u[9], status: 'Operativa', driver: (people.find(p => p.unit === 'u-' + u[0] && /^Conductor/.test(p.role)) || {}).id || '' }));
    const docs = UNIDADES.flatMap(u => [
      { id: 'd-' + u[0] + '-soat', unit: 'u-' + u[0], type: 'SOAT', number: '', expiry: '', photos: [] },
      { id: 'd-' + u[0] + '-citv', unit: 'u-' + u[0], type: 'CITV (revisión técnica)', number: '', expiry: '', photos: [] },
      { id: 'd-' + u[0] + '-tuc', unit: 'u-' + u[0], type: 'TUC', number: u[8], expiry: '', photos: [] }
    ]);
    return { version: 2, people, trucks, docs, attendance: [], notes: [], maint: [], daily: [], moves: [], paid: {} };
  };
})();
