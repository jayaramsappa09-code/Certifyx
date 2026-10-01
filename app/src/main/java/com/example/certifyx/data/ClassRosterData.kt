package com.example.certifyx.data

import com.example.certifyx.model.Student

object ClassRosterData {
    val FIXED_CLASS_ROSTER_STATIC = listOf(
        Student("25A31A05DV", "ADABALA NAVYA RAMYA SREE"),
        Student("25A31A05DW", "BEVARA PRASANTHI"),
        Student("25A31A05DX", "CHILLA DEEPTHI"),
        Student("25A31A05DY", "DORA JERIYA"),
        Student("25A31A05DZ", "EELI HEMA VENKATA LALITHA"),
        Student("25A31A05EA", "ESARAPU SATYAVENI"),
        Student("25A31A05EB", "GUBBALA YASASWI DEVI"),
        Student("25A31A05EC", "GUTTA THRAITHESHWARI"),
        Student("25A31A05ED", "INAKOTI BHANU CHANDINI"),
        Student("25A31A05EE", "KAKILETI SHINY HADASSAH"),
        Student("25A31A05EF", "KOTHAPALLI SWARNA MADHURI"),
        Student("25A31A05EG", "MADDALA LEELA RAMYA VANI"),
        Student("25A31A05EH", "MANGARA ELIJIBETH ROJA"),
        Student("25A31A05EI", "MOHAMMAD ZAHURUNNISA BEGUM"),
        Student("25A31A05EJ", "MORUKURTHI GOWTHAMI"),
        Student("25A31A05EK", "MULLAPUDI MAITRI NARMADA DEVI"),
        Student("25A31A05EL", "OBILISETTI VENNELA"),
        Student("25A31A05EM", "PATAN FATHIMA"),
        Student("25A31A05EN", "PEMMANABOIDI KEERTHANA"),
        Student("25A31A05EO", "PEMMIREDDY MOUNIKA SURYA"),
        Student("25A31A05EP", "PENUGONDA MOUNIKA"),
        Student("25A31A05EQ", "RAMIREDDY DEVI KEERTHANA"),
        Student("25A31A05ER", "REDNAM LAKSHMI SATHVIKA"),
        Student("25A31A05ES", "TALLURI JAHNAVI"),
        Student("25A31A05ET", "VASAMSETTI JAHNAVI DEVI"),
        Student("25A31A05EU", "VASAMSETTI RAMA LAKSHMI"),
        Student("25A31A05EV", "VELUGUBANTLA SOWMYA VIJAYA VIGNESWARI"),
        Student("25A31A05EW", "YANDAPALLI MOHANA LAKSHMI"),
        Student("25A31A05EX", "ATTULURI MANIKANTA"),
        Student("25A31A05EY", "CHALLA BARGAVA SATYA SAI RAKESH"),
        Student("25A31A05EZ", "CHETTI SURYA PAUL"),
        Student("25A31A05FA", "DASARI MOHITH SUBHASH"),
        Student("25A31A05FB", "DEVISETTI VENKATA RISHI RAJ"),
        Student("25A31A05FC", "DUGGIRALA HEMANTH"),
        Student("25A31A05FD", "GANAPABATHULA SUPRADEEP"),
        Student("25A31A05FE", "GANNI VENKAT"),
        Student("25A31A05FF", "GONELA MOHAN SAI KIRAN"),
        Student("25A31A05FG", "GOPALADASU DURGA AJAY KUMAR"),
        Student("25A31A05FH", "GUDURI HARI NAGA CHANDRA HANISH"),
        Student("25A31A05FI", "GUMMADI PRUDVIRAJ"),
        Student("25A31A05FJ", "GUMMALLA VEERA MANIKANTA VIVEK"),
        Student("25A31A05FK", "JETTY ASHER JOSEPH"),
        Student("25A31A05FL", "JYOTHULA MANIDEEP"),
        Student("25A31A05FM", "KALLA TEJOMAYA"),
        Student("25A31A05FN", "KATARI DATTA PAVAN SAI KRISHNA"),
        Student("25A31A05FO", "KONDETI SATYA BHIMA SANKARA SAINADH"),
        Student("25A31A05FP", "KOPPANATHI BABI"),
        Student("25A31A05FQ", "LELLA BHARGAV"),
        Student("25A31A05FR", "MADAKAM LAKSHMAN LOKESH"),
        Student("25A31A05FS", "MANDELA VENKATESH"),
        Student("25A31A05FT", "MUMMIDI PAVAN SURYA CHAITANYA"),
        Student("25A31A05FU", "MUMMIDI VENKATA BAPANNA SATYA PAVAN"),
        Student("25A31A05FV", "NATHIPAM SRINIVAS"),
        Student("25A31A05FW", "NEELAPALA SATYA SUDHEER"),
        Student("25A31A05FX", "PEDAPATI SAI MALLIKHARJUN"),
        Student("25A31A05FY", "PERURI SAI NIKHIL"),
        Student("25A31A05FZ", "ROHITH S S SURYANARAYANA DEVUNI"),
        Student("25A31A05GA", "SALADI G S NAGA VENKATA RATNA SAIRAM"),
        Student("25A31A05GB", "SAPPA JAYARAM SIVA PRASAD"),
        Student("25A31A05GC", "SASUBILLI SASANK MANINDHAR"),
        Student("25A31A05GD", "TAVVA KISHORE"),
        Student("25A31A05GE", "TELU MALLIKARJUN"),
        Student("25A31A05GF", "VADDI SHAUN AJIT"),
        Student("25A31A05GG", "VANAMALI SIVA NAGA SATYA NARASIMHA"),
        Student("25A31A05GH", "VASAMSETTI PRUDHVI"),
        Student("25A31A05GI", "YALLA ARYA")
    )

    fun normalizeRollNumber(input: String?): String {
        if (input.isNullOrBlank()) return ""
        return input.trim().uppercase().replace(Regex("[\\s\\-_.]"), "")
    }

    fun extractRollNumberFromText(text: String): String? {
        if (text.isBlank()) return null
        val clean = text.trim()
        val standardMatch = Regex("([0-9]{2}[A-Za-z][0-9]{2}[A-Za-z][0-9]{2}[A-Za-z0-9]{2})").find(clean)
        if (standardMatch != null) {
            return normalizeRollNumber(standardMatch.value)
        }
        for (student in FIXED_CLASS_ROSTER_STATIC) {
            val suffix = student.rollNo.substring(6)
            if (clean.contains(suffix, ignoreCase = true)) {
                return student.rollNo
            }
        }
        return null
    }
}
