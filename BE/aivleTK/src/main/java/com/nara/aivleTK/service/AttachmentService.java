package com.nara.aivleTK.service;

import ch.qos.logback.core.net.server.Client;
import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.BlobServiceClientBuilder;
import com.azure.storage.blob.models.BlobHttpHeaders;
import com.azure.storage.blob.options.BlobParallelUploadOptions;
import com.nara.aivleTK.domain.Attachment.Attachment;
import com.nara.aivleTK.domain.Bid;
import com.nara.aivleTK.repository.AttachmentRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AttachmentService {

    private final AttachmentRepository attachmentRepository;

    @Value("${azure.storage.connection-string}")
    private String connectionString;

    @Value("${azure.storage.container-name}")
    private String containerName;

    private BlobContainerClient containerClient;

    @PostConstruct // 서버 시작 시 Azure와 한 번 연결
    public void init() {
        BlobServiceClient blobServiceClient = new BlobServiceClientBuilder()
                .connectionString(connectionString)
                .buildClient();
        this.containerClient = blobServiceClient.getBlobContainerClient(containerName);
    }

    public List<Attachment> uploadFiles(MultipartFile[] files) throws IOException {
        List<Attachment> attachments = new ArrayList<>();

        for (MultipartFile file : files) {
            if (file.isEmpty()) continue;

            String fileName = file.getOriginalFilename();
            String storeName = UUID.randomUUID() + "_" + fileName; // 중복 방지를 위한 UUID

            // azure에 업로드
            BlobClient blobClient = containerClient.getBlobClient(storeName);
            // blobClient.upload(file.getInputStream(), file.getSize(), true);
            BlobHttpHeaders headers = new BlobHttpHeaders().setContentType(file.getContentType());
            blobClient.uploadWithResponse(new BlobParallelUploadOptions(file.getInputStream())
                    .setHeaders(headers), null, null);

            String url = blobClient.getBlobUrl();

            Attachment attachment = new Attachment(fileName, storeName, url);
            attachments.add(attachmentRepository.save(attachment)); // db에 저장
        }
        return attachments;
    }

    private final RestTemplate restTemplate;

    public void saveAttachmentInfoOnly(Bid bid, String fileName, String fileUrl){
        if(fileUrl == null||fileUrl.isBlank()||fileName==null){
            return;
        }
        try{
            Attachment attachment = new Attachment();
            attachment.setBid(bid);
            attachment.setFileName(fileName);
            attachment.setUrl(fileUrl);
            attachment.setStoreName(null);
            attachmentRepository.save(attachment);
        }catch(Exception e){
            e.printStackTrace();
        }
    }


    public Attachment uploadPDF(String fileName, byte[] pdfData) {

        String storeName = UUID.randomUUID() + "_" + fileName; // 제목 중복 방지

        // azure 업로드
        BlobClient blobClient = containerClient.getBlobClient(storeName);
        try (InputStream inputStream = new ByteArrayInputStream(pdfData)) {
            BlobHttpHeaders headers = new BlobHttpHeaders().setContentType("application/pdf"); // 다운받지 않고 바로 보이게

            blobClient.uploadWithResponse(
                    new BlobParallelUploadOptions(inputStream).setHeaders(headers), null, null);
        } catch (IOException e) {
            throw new RuntimeException("PDF 업로드 실패", e);
        }

        // db에 저장
        String url = blobClient.getBlobUrl();
        Attachment attachment = new Attachment(fileName, storeName, url);
        return attachmentRepository.save(attachment);
    }
}
