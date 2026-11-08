package ru.luxkolbasa

import kotlin.random.Random

/**
 * Детерминированный генератор псевдоитальянских названий.
 * Одинаковая рецептура -> одинаковое имя (seed вычисляется из параметров).
 */
object NameGenerator {

    private val types = listOf(
        "Salame", "Salsiccia", "Mortadella", "Soppressata",
        "Culatello", "Pancetta", "Bresaola"
    )
    private val personalNames = listOf(
        "Peppino", "Salvatore", "Giovanni", "Luigi", "Mario", "Vincenzo",
        "Giuseppe", "Lorenzo", "Alberto", "Francesco", "Bernardo", "Tommaso"
    )
    private val places = listOf(
        "di Parma", "di Bologna", "di Napoli", "di Milano", "Toscano",
        "Siciliano", "Piemontese", "Veneziano", "Lombardo", "Calabrese", "Romano"
    )
    private val titles = listOf(
        "Imperiale", "Reale", "di Lusso", "Supremo", "Nobile", "Grande"
    )

    fun compose(salt: Int, fat: Int, pepper: Int): RecipeResponse {
        val seed = salt * 1_000_000L + fat * 1_000L + pepper
        val rnd = Random(seed)

        var name = "${types[rnd.nextInt(types.size)]} " +
                "${personalNames[rnd.nextInt(personalNames.size)]} " +
                places[rnd.nextInt(places.size)]

        // Экстремально насыщенный рецепт получает титул
        if (salt + fat + pepper >= 240) {
            name += " ${titles[rnd.nextInt(titles.size)]}"
        }

        val traits = mutableListOf<String>()
        when {
            pepper > 66 -> traits += "piccante"
            pepper > 33 -> traits += "speziata"
            pepper < 10 -> traits += "delicata"
        }
        if (salt > 66) traits += "sapida"
        if (salt < 10) traits += "sciocca"
        when {
            fat > 66 -> traits += "grassa e ricca"
            fat < 10 -> traits += "magrolina"
        }
        val description = if (traits.isEmpty()) "la classica" else traits.joinToString(", ")

        return RecipeResponse(name = name, description = description, seed = seed)
    }
}