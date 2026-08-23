/**
 * MGRS / UTM to LatLng Converter for BPP 924 Tactical Operations
 * Special focus on 47NQH (Pattani & Southern Border Provinces)
 */

window.MGRSConverter = (function() {
    const a = 6378137.0;
    const f = 1 / 298.257223563;
    const b = a * (1 - f);
    const e = Math.sqrt(1 - (b / a) ** 2);
    const ePrimeSq = (e ** 2) / (1 - e ** 2);
    const k0 = 0.9996;

    const GRID_100K_ORIGIN = {
        'QH': { eastingPrefix: 700000, northingPrefix: 700000, zone: 47 },
        'QG': { eastingPrefix: 700000, northingPrefix: 600000, zone: 47 },
        'PH': { eastingPrefix: 600000, northingPrefix: 700000, zone: 47 },
        'PG': { eastingPrefix: 600000, northingPrefix: 600000, zone: 47 }
    };

    function utmToLatLng(easting, northing, zone = 47, isNorthern = true) {
        const x = easting - 500000.0;
        const y = isNorthern ? northing : northing - 10000000.0;

        const m = y / k0;
        const mu = m / (a * (1 - (e**2)/4 - 3*(e**4)/64 - 5*(e**6)/256));

        const e1 = (1 - Math.sqrt(1 - e**2)) / (1 + Math.sqrt(1 - e**2));
        const phi1Rad = mu + (3*e1/2 - 27*(e1**3)/32)*Math.sin(2*mu) + 
                             (21*(e1**2)/16 - 55*(e1**4)/32)*Math.sin(4*mu) + 
                             (151*(e1**3)/96)*Math.sin(6*mu);

        const n1 = a / Math.sqrt(1 - (e**2) * (Math.sin(phi1Rad)**2));
        const t1 = Math.tan(phi1Rad)**2;
        const c1 = ePrimeSq * (Math.cos(phi1Rad)**2);
        const r1 = a * (1 - e**2) / ((1 - (e**2) * (Math.sin(phi1Rad)**2))**1.5);
        const d = x / (n1 * k0);

        let lat = phi1Rad - (n1 * Math.tan(phi1Rad) / r1) * (
            (d**2)/2 - 
            (5 + 3*t1 + 10*c1 - 4*(c1**2) - 9*ePrimeSq)*(d**4)/24 + 
            (61 + 90*t1 + 298*c1 + 45*(t1**2) - 252*ePrimeSq - 3*(c1**2))*(d**6)/720
        );
        lat = (lat * 180) / Math.PI;

        let lon = (d - 
                   (1 + 2*t1 + c1)*(d**3)/6 + 
                   (5 - 2*c1 + 28*t1 - 3*(c1**2) + 8*ePrimeSq + 24*(t1**2))*(d**5)/120) / Math.cos(phi1Rad);
        const lon0 = (zone - 1) * 6 - 180 + 3;
        lon = lon0 + (lon * 180) / Math.PI;

        return { lat, lng: lon };
    }

    function parseMGRS(mgrsStr) {
        if (!mgrsStr) return null;
        const thaiNums = ['๐','๑','๒','๓','๔','๕','๖','๗','๘','๙'];
        let clean = mgrsStr.toString();
        thaiNums.forEach((t, i) => {
            clean = clean.split(t).join(i.toString());
        });
        clean = clean.replace(/[\s-]/g, '').toUpperCase();

        const match = clean.match(/(?:47[A-Z])?([A-Z]{2})([0-9]{6,10})/);
        if (!match) {
            const latLonMatch = clean.match(/([0-9]+\.[0-9]+)[,\s]+([0-9]+\.[0-9]+)/);
            if (latLonMatch) {
                return { lat: parseFloat(latLonMatch[1]), lng: parseFloat(latLonMatch[2]) };
            }
            return null;
        }

        const grid100k = match[1];
        const digits = match[2];
        const halfLen = digits.length / 2;
        const eStr = digits.substring(0, halfLen);
        const nStr = digits.substring(halfLen);

        const scale = Math.pow(10, 5 - halfLen);
        const eastingOffset = parseFloat(eStr) * scale;
        const northingOffset = parseFloat(nStr) * scale;

        let eastingPrefix = 700000;
        let northingPrefix = 700000;
        let zone = 47;

        if (GRID_100K_ORIGIN[grid100k]) {
            eastingPrefix = GRID_100K_ORIGIN[grid100k].eastingPrefix;
            northingPrefix = GRID_100K_ORIGIN[grid100k].northingPrefix;
            zone = GRID_100K_ORIGIN[grid100k].zone;
        }

        const totalEasting = eastingPrefix + eastingOffset;
        const totalNorthing = northingPrefix + northingOffset;

        return utmToLatLng(totalEasting, totalNorthing, zone, true);
    }

    return {
        utmToLatLng,
        parseMGRS
    };
})();
