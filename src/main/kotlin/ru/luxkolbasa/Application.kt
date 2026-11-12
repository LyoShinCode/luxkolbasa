package ru.luxkolbasa

import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.http.content.staticResources
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.*
import kotlinx.serialization.json.*

@Serializable
data class RecipeRequest(val salt: Int, val fat: Int, val pepper: Int)

@Serializable
data class RecipeResponse(val name: String, val description: String, val seed: Long)

fun main() {
    val port = System.getenv("PORT")?.toIntOrNull() ?: 8080
    embeddedServer(Netty, port = port, host = "0.0.0.0") {
        module()
    }.start(wait = true)
}

fun Application.module() {
    install(ContentNegotiation) {
        json(Json { prettyPrint = true })
    }

    routing {
        get("/") {
            call.respondRedirect("/index.html", permanent = false)
        }

        staticResources("/", "static")

        post("/api/generate") {
            val request = runCatching { call.receive<RecipeRequest>() }.getOrNull()

            if (request == null) {
                call.respondText(
                    """{"error":"Ожидается JSON вида {salt:0..100, fat:0..100, pepper:0..100}"}""",
                    ContentType.Application.Json,
                    HttpStatusCode.BadRequest
                )
                return@post
            }

            val recipe = NameGenerator.compose(
                salt = request.salt.coerceIn(0, 100),
                fat = request.fat.coerceIn(0, 100),
                pepper = request.pepper.coerceIn(0, 100)
            )
            call.respond(recipe)
        }
    }
}