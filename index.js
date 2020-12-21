const { Client, Util, MessageEmbed } = require('discord.js');
const ytdl = require('ytdl-core');
const Youtube = require(`simple-youtube-api`)
const PREFIX = "~";

const client = new Client({ disableEveryone: true });

const youtube = new Youtube("AIzaSyB1Z8EkjZ9Xf4QyNqQFe1rXGPokMqFwr1c");
//const youtube = new Youtube("AIzaSyAGmpS9qDMwLgOU1qhSlfwTaJUPFP0NBfY");

const queue = new Map();

client.on("ready", () => {
    console.log(`${client.user.usernmae} is online`)
    client.user.setActivity("⛧MUSIC⛧")
});

client.on("message", async message => {
    if(message.content.startsWith(`${PREFIX}ping`)) {
    const aA = await message.channel.send(`Pinging...`);

    aA.edit(`Pong!
    latency is ${Math.floor(aA.createdTimestamp - message.createdTimestamp)}ms Api Latency is ${Math.round(client.ping)}ms`);
}
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
        if(!voiceChannel) return message.channel.send("lu perlu masuk voice channel dulu tolol!")
        const permission = voiceChannel.permissionsFor(message.client.user)
        if(!permission.has('CONNECT')) return message.channel.send("Aing gak punya permission mauk kesana njeng!")
        if(!permission.has("SPEAK")) return message.channel.send("Aing gak punya permission mauk kesana njeng!")

        try {
            var video = await youtube.getVideoByID(url)
        } catch {
            try {
                var videos = await youtube.searchVideos(searchString, 1)
                var video = await youtube.getVideoByID(videos[0].id)
            } catch {
                return message.channel.send('gada!')
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
            return message.channel.send(`**${song.title}** dah gw tambahin ke queue ya SU!`)
        }
        return undefined
    } else if (message.content.startsWith(`${PREFIX}stop`)) {
        if(!message.member.voice.channel) return message.channel.send("Lu perlu masuk dulu ke voice channel ya njeng!")
        if(!serverQueue) return message.channel.send("There is nothing playing!")
        serverQueue.songs = []
        serverQueue.connection.dispatcher.end()
        message.channel.send("dah gw stop musiknya ya su!")
        return undefined
    } else if (message.content.startsWith(`${PREFIX}skip`)) {
        if(!message.member.voice.channel) return message.channel.send("Lu perlu masuk dulu ke voice channel ya njeng!!")
        if(!serverQueue) return message.channel.send("There is nothing playing!")
        serverQueue.connection.dispatcher.end()
        message.channel.send("dah gw skip musiknya ya su!")
        return undefined
    } else if (message.content.startsWith(`${PREFIX}volume`)) {
        if(!message.member.voice.channel) return message.channel.send("Lu perlu masuk dulu ke voice channel ya njeng!!")
        if(!serverQueue) return message.channel.send("There is nothing playing in the queue!")
        if(!args[1]) return message.channel.send(`That volume is **${serverQueue.volume}**`)
        if(isNaN(args[1])) return message.channel.send("That is not a valid volume to change to!")
        serverQueue.volume = args[1]
        serverQueue.connection.dispatcher.setVolumeLogarithmic(args[1]/ 5)
        message.channel.send(`dah gw set volumenya jadi **${args[1]}**`)
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
        if(!message.member.voice.channel) return message.channel.send("Lu perlu masuk dulu ke voice channel ya njeng!!")
        if(!serverQueue) return message.channel.send("There is nothing playing!")
        if(!serverQueue.playing) return message.channel.send("The music is already paused!")
        serverQueue.playing = false
        serverQueue.connection.dispatcher.pause()
        message.channel.send("dah gw pause musiknya ya njeng!")
        return undefined
    } else if (message.content.startsWith(`${PREFIX}resume`)) {
        if(!message.member.voice.channel) return message.channel.send("Lu perlu masuk dulu ke voice channel ya njeng!!")
        if(!serverQueue) return message.channel.send("There is nothing playing!")
        if(serverQueue.playing) return message.channel.send("kan udah sedang di play musiknya njeng ngapa lu resume lagi?")
        serverQueue.playing = true
        serverQueue.connection.dispatcher.resume()
        message.channel.send("dah gw resume musiknya ya njeng!")
        return undefined
    } else if (message.content.startsWith(`${PREFIX}help`)) {
        const meessdd = new MessageEmbed()
        .setColor("RANDOM")
        .setTitle("Help commands for Odell 🎵🎵🎵")
        .addField('Music commands!', '`~play <song name>`, `~stop`, `~skip`, `~pause`, `~resume`, `~queue`, `~now playing`, `~volume`, `TO DISCONNECT ME MAKE SURE THERES NO QUEUE IF NOT YOU WILL IN TROUBLE`')
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

client.on("message", async message => {
    if(message.content.startsWith(`${PREFIX}hello`)) {
        message.channel.send(`apa?`)
    }

})

client.on("message", async message => {
    if(message.content.startsWith(`${PREFIX}anjing`)) {
        message.channel.send(`apa lo ngentod?`)
    }

})

client.login("Nzg5NzczOTk2NzYxMTUzNTQ2.X928Wg.PiSxOVud5zMDrSv8byNLPdBte1g")
