const { Client, Util, MessageEmbed } = require('discord.js');
const ytdl = require('ytdl-core');
const Youtube = require(`simple-youtube-api`)
const PREFIX = "1";

const client = new Client({ disableEveryone: true });

const youtube = new Youtube("AIzaSyAGmpS9qDMwLgOU1qhSlfwTaJUPFP0NBfY")

const queue = new Map()

client.on("ready", () => {
    console.log("DONE!")
    client.user.setActivity("MUSIC IN TEST SERVER", ({ type: "PLAYING" }));
})

client.on('message', async message => {
    if(message.author.bot) return
    if(!message.content.startsWith(PREFIX)) return

    const args = message.content.substring(PREFIX.length).split(" ")
    const searchString = args.slice(1).join(' ')
    const url = args[1] ? args[1].replace(/<(.+)>/g, '$1') : ''
    const serverQueue = queue.get(message.guild.id)

    if(message.content.startsWith(`${PREFIX}play`)) {
        const voiceChannel = message.member.voice.channel
        if(!voiceChannel) return message.channel.send("You need to be in a voice channel to play music!")
        const permission = voiceChannel.permissionsFor(message.client.user)
        if(!permission.has('CONNECT')) return message.channel.send("I don\'t have the permission to speak in the voice channel you\'re at right now!")
        if(!permission.has("SPEAK")) return message.channel.send("I don\'t have the permission to play music in the voice channnel you\'re at now!")

        try {
            var video = await youtube.getVideoByID(url)
        } catch {
            try {
                var videos = await youtube.searchVideos(searchString, 1)
                var video = await youtube.getVideoByID(videos[0].id)
            } catch {
                return message.channel.send('I could not find any search results!')
            }
        }

        const song = {
            id: video.id,
            title: video.title,
            url: `https://www.youtube.com/watch?v=${video.id}`
        }

        if(!serverQueue) {
            const queueConstruct = {
                textchannel: message.channel,
                voiceChannel: voiceChannel,
                connection: null,
                songs: [],
                volume: 5,
                playing: true
            }
            queue.set(message.guild.id, queueConstruct)

            queueConstruct.songs.push(song)

            try {
                var connection = await voiceChannel.join()
                queueConstruct.connection = connection
                play(message.guild, queueConstruct.songs[0])
            } catch (error) {
                console.log(`There was an error joining the voice channel: ${error}`)
                queue.delete(message.guild.id)
                return message.channel.send(`There was an error joining the voice channel: ${error}`)
            }
        } else {
            serverQueue.songs.push(song)
            return message.channel.send(`**${song.title}** has been added to the queue!`)
        }
        return undefined
    } else if (message.content.startsWith(`${PREFIX}stop`)) {
        if(!message.member.voice.channel) return message.channel.send("You need to be in a voice chanel that I\'m at to stop playing music!")
        if(!serverQueue) return message.channel.send("There is nothing playing!")
        serverQueue.songs = []
        serverQueue.connection.dispatcher.end()
        message.channel.send("I have stoppped the music for you!")
        return undefined
    } else if (message.content.startsWith(`${PREFIX}skip`)) {
        if(!message.member.voice.channel) return message.channel.send("You need to be in a voice channel where I\'m at to skip music!")
        if(!serverQueue) return message.channel.send("There is nothing playing!")
        serverQueue.connection.dispatcher.end()
        message.channel.send("Successfully skipped the music!")
        return undefined
    } else if (message.content.startsWith(`${PREFIX}volume`)) {
        if(!message.member.voice.channel) return message.channel.send("You need to be in a voice channel to set the volume!")
        if(!serverQueue) return message.channel.send("There is nothing playing in the queue!")
        if(!args[1]) return message.channel.send(`That volume is **${serverQueue.volume}**`)
        if(isNaN(args[1])) return message.channel.send("That is not a valid volume to change to!")
        serverQueue.volume = args[1]
        serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1]/ 5)
        message.channel.send(`Sucessfully set the volume to **${args[1]}**`)
        return undefined
    } else if (message.content.startsWith(`${PREFIX}now playing`)) {
        if(!serverQueue) return message.channel.send("There is nothing playing!")
        message.channel.send(`Now playing **${serverQueue.songs[0].title}**`)
        return undefined
    } else if (message.content.startsWith(`${PREFIX}queue`)) {
        if(!serverQueue) return message.channel.send("There is nothing playing!")
        message.channel.send(`
__**Song Queue**__
${serverQueue.songs.map(song => `**-** ${song.title}`).join('\n')}
**Now Playing:** ${serverQueue.songs[0].title}
        `, { split: true})
        return undefined
    } else if (message.content.startsWith(`${PREFIX}pause`)) {
        if(!message.member.voice.channel) return message.channel.send("You need to be in a voice channel where I\'m at to pause the music I\'m playing!")
        if(!serverQueue) return message.channel.send("There is nothing playing!")
        if(!serverQueue.playing) return message.channel.send("The music is already paused!")
        serverQueue.playing = false
        serverQueue.connection.dispatcher.pause()
        message.channel.send("I have paused the music for you!")
        return undefined
    } else if (message.content.startsWith(`${PREFIX}resume`)) {
        if(!message.member.voice.channel) return message.channel.send("You need to be in a voice channel where I\'m at to resume the music I\'m playing!")
        if(!serverQueue) return message.channel.send("There is nothing playing!")
        if(serverQueue.playing) return message.channel.send("The music is already resume! Or the music is playing and you send the resume command which totally doesn\'t make sense lol :rofl:")
        serverQueue.playing = true
        serverQueue.connection.dispatcher.resume()
        message.channel.send("I have paused the music for you!")
        return undefined
    } else if (message.content.startsWith(`${PREFIX}help`)) {
        const meessdd = new MessageEmbed()
        .setColor("RANDOM")
        .setTitle("Help commands for SCRFC server Music 🎵🎵🎵")
        .addField('Music commands!', '`1play <song name>`, `1stop`, `1skip`, `1pause`, `1resume`, `1queue`, `1now playing`, `1volume`, `TO DISCONNECT ME MAKE SURE THERES NO QUEUE IF NOT YOU WILL IN TROUBLE`')
        message.channel.send(meessdd)
        return undefined
    }
})

function play(guild, song) {
    const serverQueue = queue.get(guild.id)

    if(!song) {
        serverQueue.voiceChannel.leave()
        queue.delete(guild.id)
        return
    }

    const dispatcher = serverQueue.connection.play(ytdl(song.url, { highWaterMark: 1 << 25 }))
        .on('finish', () => {
            serverQueue.songs.shift()
            play(guild, serverQueue.songs[0])
        })
        .on('error', error => {
            console.log(error)
        })
        dispatcher.setVolumeLogarithmic(serverQueue.volume / 5)

        serverQueue.textchannel.send(` Start playing: **${song.title}**`)
}

client.login("TOKEN")